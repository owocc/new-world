import { and, desc, eq, lt, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { aiCharacters, aiMemories, conversations, groupMembers, groupMessages, groups, messages } from '@/db/schema';
import { getMediaForMessages, type MediaAssetView } from '@/server/media';
import { formatAttachmentPromptBlock } from './vision';
import { runObject, runText } from './core';

export type MemoryRetentionLevel = 'excellent' | 'normal' | 'slightly_forgetful' | 'forgetful';

export interface ForgetfulnessConfig {
  level: MemoryRetentionLevel;
  label: string;
  stars: number;
  description: string;
  writeProbability: number;      // Probability of recording non-critical fact (0..1)
  detailRetention: number;       // Detail preservation factor (0..1)
  decayHalfLifeDays: number;     // Days until strength halves without reinforcement
  recallConfidenceBase: number;  // Base confidence baseline
  maxActiveMemories: number;     // Max high-salience memories injected into prompt
}

export const FORGETFULNESS_PROFILES: Record<MemoryRetentionLevel, ForgetfulnessConfig> = {
  excellent: {
    level: 'excellent',
    label: '过目不忘',
    stars: 5,
    description: '博闻强识，哪怕随口一句小事也能牢牢记住，极少遗忘细节',
    writeProbability: 0.95,
    detailRetention: 0.95,
    decayHalfLifeDays: 90,
    recallConfidenceBase: 0.95,
    maxActiveMemories: 12,
  },
  normal: {
    level: 'normal',
    label: '普通记忆',
    stars: 3,
    description: '标准人类记忆，重要事和反复提及的事记得清，琐碎日常随时间模糊',
    writeProbability: 0.70,
    detailRetention: 0.70,
    decayHalfLifeDays: 14,
    recallConfidenceBase: 0.75,
    maxActiveMemories: 7,
  },
  slightly_forgetful: {
    level: 'slightly_forgetful',
    label: '有点健忘',
    stars: 2,
    description: '经常需要提示才能想起来细节，“我记得你好像说过...”，偶尔翻记录',
    writeProbability: 0.45,
    detailRetention: 0.50,
    decayHalfLifeDays: 5,
    recallConfidenceBase: 0.55,
    maxActiveMemories: 5,
  },
  forgetful: {
    level: 'forgetful',
    label: '贵人多忘事 / 鱼的记忆',
    stars: 1,
    description: '极易遗忘日常琐事，“啊？你跟我说过吗？等我翻翻聊天记录”，只对特别深刻/记仇的事有印象',
    writeProbability: 0.25,
    detailRetention: 0.30,
    decayHalfLifeDays: 2,
    recallConfidenceBase: 0.35,
    maxActiveMemories: 4,
  },
};

export function getForgetfulnessProfile(level?: string | null): ForgetfulnessConfig {
  if (level && level in FORGETFULNESS_PROFILES) {
    return FORGETFULNESS_PROFILES[level as MemoryRetentionLevel];
  }
  return FORGETFULNESS_PROFILES.normal;
}

/** How many recent messages are kept verbatim in the model context. */
const CONTEXT_WINDOW = 16;
/** Once unsummarized messages exceed this, older ones get folded into the summary. */
const SUMMARIZE_THRESHOLD = 20;

export async function getRecentMessages(conversationId: string, limit = CONTEXT_WINDOW): Promise<(typeof messages.$inferSelect & { attachments: MediaAssetView[] })[]> {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  const msgIds = rows.map((r) => r.id);
  const mediaMap = await getMediaForMessages(msgIds);

  return rows.map((r) => ({
    ...r,
    attachments: mediaMap.get(r.id) || [],
  }));
}

export type FormattedMemoryItem = {
  id: string;
  kind: string;
  content: string;
  strength: number;
  confidence: number;
  importance: number;
  emotionalWeight: number;
  reinforcementCount: number;
  formattedText: string;
  isFuzzy: boolean;
};

/**
 * Calculate dynamic decayed strength of a memory based on character's retention profile,
 * elapsed time since last reinforcement, importance, and grudge traits.
 */
export function calculateDecayedMemory(
  mem: typeof aiMemories.$inferSelect,
  profile: ForgetfulnessConfig,
  grudgeRate: number = 0.3,
  now: Date = new Date()
): { strength: number; confidence: number; isFuzzy: boolean } {
  const elapsedMs = Math.max(0, now.getTime() - new Date(mem.lastReinforcedAt).getTime());
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

  // Emotional/Grudge adjustment:
  // If memory is grudge/negative or deeply emotional, and character has high grudgeRate,
  // decay rate slows down dramatically (retention goes way up)!
  const isGrudgeOrEmotional = mem.kind === 'grudge' || Math.abs(mem.emotionalWeight) >= 0.5;
  const emotionalShield = isGrudgeOrEmotional ? Math.max(0.2, grudgeRate * 1.5) : 0;

  // Effective half life with reinforcement bonus
  const reinforcementBonus = Math.min(3, 1 + (mem.reinforcementCount - 1) * 0.4);
  const importanceBonus = Math.max(0.5, mem.importance * 1.8);
  const effectiveHalfLife = profile.decayHalfLifeDays * reinforcementBonus * importanceBonus * (1 + emotionalShield * 2);

  // Exponential decay
  const decayFactor = Math.pow(0.5, elapsedDays / Math.max(0.5, effectiveHalfLife));
  const currentStrength = Math.min(1.0, Math.max(0.01, mem.strength * decayFactor));

  // Dynamic confidence: influenced by strength, profile baseline, and reinforcement
  const confidence = Math.min(
    1.0,
    Math.max(
      0.1,
      currentStrength * profile.recallConfidenceBase * (0.8 + Math.min(0.4, (mem.reinforcementCount - 1) * 0.1))
    )
  );

  const isFuzzy = confidence < 0.65 || currentStrength < 0.4;

  return {
    strength: currentStrength,
    confidence,
    isFuzzy,
  };
}

/**
 * Format a memory into human-like recall text.
 * When a memory is fuzzy/low confidence, format it as a hazy recollection so the AI expresses it naturally.
 */
export function formatMemoryForPrompt(
  mem: typeof aiMemories.$inferSelect,
  decayed: { strength: number; confidence: number; isFuzzy: boolean }
): string {
  if (decayed.isFuzzy) {
    if (decayed.confidence < 0.4) {
      return `【模糊隐约的印象（可能记不清具体细节/时间）】${mem.content}`;
    }
    return `【有点模糊的记忆（可能需要确认或查证）】${mem.content}`;
  }

  if (mem.kind === 'grudge' || mem.emotionalWeight <= -0.5) {
    return `【深刻/心结记忆】${mem.content}`;
  }

  if (mem.reinforcementCount >= 3 || mem.importance >= 0.8) {
    return `【清晰明确的牢固记忆】${mem.content}`;
  }

  return mem.content;
}

/**
 * Get active memories for character grounded in human-like retention.
 */
export async function getActiveMemoriesForCharacter(
  characterId: string,
  options?: {
    limit?: number;
    now?: Date;
  }
): Promise<FormattedMemoryItem[]> {
  const [char] = await db
    .select({
      memoryRetention: aiCharacters.memoryRetention,
      grudgeRate: aiCharacters.grudgeRate,
    })
    .from(aiCharacters)
    .where(eq(aiCharacters.id, characterId))
    .limit(1);

  const profile = getForgetfulnessProfile(char?.memoryRetention);
  const grudgeRate = char?.grudgeRate ?? 0.3;
  const now = options?.now ?? new Date();
  const maxLimit = options?.limit ?? profile.maxActiveMemories;

  const rawRows = await db
    .select()
    .from(aiMemories)
    .where(and(eq(aiMemories.characterId, characterId), sql`${aiMemories.strength} > 0.15`))
    .orderBy(desc(aiMemories.importance), desc(aiMemories.lastReinforcedAt))
    .limit(30);

  const processed: FormattedMemoryItem[] = [];

  for (const row of rawRows) {
    const decayed = calculateDecayedMemory(row, profile, grudgeRate, now);
    // If completely faded out for this persona (e.g. extremely forgetful), drop from active prompt
    if (decayed.strength < 0.18 && decayed.confidence < 0.25) {
      continue;
    }

    processed.push({
      id: row.id,
      kind: row.kind,
      content: row.content,
      strength: decayed.strength,
      confidence: decayed.confidence,
      importance: row.importance,
      emotionalWeight: row.emotionalWeight,
      reinforcementCount: row.reinforcementCount,
      formattedText: formatMemoryForPrompt(row, decayed),
      isFuzzy: decayed.isFuzzy,
    });
  }

  // Sort by effective strength * importance
  processed.sort((a, b) => (b.strength * b.importance + (b.emotionalWeight < -0.3 ? 0.3 : 0)) - (a.strength * a.importance + (a.emotionalWeight < -0.3 ? 0.3 : 0)));

  return processed.slice(0, maxLimit);
}

export async function getMemories(characterId: string, limit = 10): Promise<string[]> {
  const active = await getActiveMemoriesForCharacter(characterId, { limit });
  return active.map((m) => m.formattedText);
}

export async function buildChatContext(args: {
  userId: string;
  conversationId: string;
  characterId: string;
}) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, args.conversationId),
        eq(conversations.userId, args.userId),
      ),
    )
    .limit(1);

  const recent = (await getRecentMessages(args.conversationId)).reverse();
  const memories = await getMemories(args.characterId);
  return { conversation: conv ?? null, recent, memories };
}

/**
 * Rolling summary: when unsummarized history grows past the threshold,
 * fold the older half into the conversation summary.
 */
export async function maybeSummarizeConversation(args: {
  userId: string;
  conversationId: string;
}) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, args.conversationId))
    .limit(1);
  if (!conv) return;

  const [{ count }] = await db
    .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
    .from(messages)
    .where(eq(messages.conversationId, args.conversationId));

  const unsummarized = count - conv.summarizedCount;
  if (unsummarized < SUMMARIZE_THRESHOLD) return;

  const toSummarizeUpto = count - CONTEXT_WINDOW;
  if (toSummarizeUpto <= conv.summarizedCount) return;

  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, args.conversationId), sql`${messages.createdAt} > 0`))
    .orderBy(messages.createdAt)
    .limit(toSummarizeUpto - conv.summarizedCount)
    .offset(conv.summarizedCount);

  if (rows.length === 0) return;

  const msgIds = rows.map((r) => r.id);
  const mediaMap = await getMediaForMessages(msgIds);
  const transcript = rows
    .map((m) => {
      const text = m.content.trim();
      const atts = mediaMap.get(m.id);
      const attachmentBlock = atts && atts.length > 0 ? formatAttachmentPromptBlock(atts) : '';
      const combined = text && attachmentBlock ? `${text}\n${attachmentBlock}` : text || attachmentBlock;
      return `${m.role === 'user' ? '用户' : '我'}：${combined}`;
    })
    .join('\n');
  const previous = conv.summary ? `之前的摘要：\n${conv.summary}\n\n` : '';

  const summary = await runText({
    userId: args.userId,
    characterId: conv.characterId,
    callType: 'summary',
    system:
      '你是对话摘要器。把聊天记录压缩成简洁的客观要点摘要，保留：事实脉络、用户的偏好、重要约定。300字以内。直接输出摘要。',
    prompt: previous + '新增对话：\n' + transcript,
    temperature: 0.3,
    maxOutputTokens: 500,
  });

  await db
    .update(conversations)
    .set({ summary, summarizedCount: toSummarizeUpto })
    .where(eq(conversations.id, args.conversationId));
}

const memoryDistillationSchema = z.object({
  memories: z
    .array(
      z.object({
        action: z.enum(['create', 'reinforce', 'merge']).describe('create:全新事实; reinforce:强化已有记忆; merge:更新合并已有记忆'),
        existingMemoryId: z.string().optional().describe('若 reinforce 或 merge，对应已有记忆的 ID'),
        kind: z.enum(['fact', 'preference', 'event', 'grudge', 'opinion']).describe('grudge:被冒犯/不满/记仇; preference:喜好厌恶; event:事件经历; fact:客观信息; opinion:观点看法'),
        content: z.string().describe('一句话提炼记忆（第三人称，如“用户下周要去深圳出差”、“觉得上次那家拉面馆很难吃”）'),
        importance: z.number().min(0).max(1).describe('重要程度：0.1轻微琐碎，0.9关键人生大事或核心原则'),
        emotionalWeight: z.number().min(-1).max(1).describe('情绪权重：-1强烈负面/记仇，0中性客观，+1极度感动/喜爱'),
      })
    )
    .max(5)
    .describe('从感知到的真实交流中提炼的记忆条目，没有值得记住的信息则返回空数组'),
});

/**
 * Consolidate and extract memories from recent interactions.
 * Strictly respects AI perception boundary: only messages the AI actually read/participated in.
 */
export async function consolidateMemories(args: {
  userId: string;
  characterId: string;
  sourceType: 'dm' | 'group' | 'feed';
  sourceId?: string;
  transcript: string;
  now?: Date;
}) {
  const now = args.now ?? new Date();

  // Fetch character config
  const [char] = await db
    .select({
      name: aiCharacters.name,
      memoryRetention: aiCharacters.memoryRetention,
      grudgeRate: aiCharacters.grudgeRate,
    })
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, args.characterId), eq(aiCharacters.userId, args.userId)))
    .limit(1);

  if (!char) return;

  const profile = getForgetfulnessProfile(char.memoryRetention);

  // Fetch existing memories for this character
  const existingRows = await db
    .select()
    .from(aiMemories)
    .where(eq(aiMemories.characterId, args.characterId))
    .orderBy(desc(aiMemories.lastReinforcedAt))
    .limit(25);

  const existingFormatted = existingRows
    .map((m) => `[ID: ${m.id}] (${m.kind}, 强化${m.reinforcementCount}次) ${m.content}`)
    .join('\n');

  try {
    const result = await runObject({
      userId: args.userId,
      characterId: args.characterId,
      callType: 'memory',
      system: `你是虚拟角色「${char.name}」的记忆沉淀中枢。
你的任务是从 TA 真正经历或读过的交流记录中，提炼出对 TA 有意义的长期记忆。
核心原则：
1. 聊天记录是客观历史，记忆是角色主观留下的印象。
2. 避免无脑新建重复条目。如果已有类似记忆（参考已有列表），请选择 reinforce（强化）或 merge（合并更新）。
3. 普通琐碎日常不要过度记录；关注个人喜好、承诺、重要事件、态度观点以及令角色不满或感动的事（grudge / emotionalWeight）。
4. 格式必须是紧凑的一句话。`,
      prompt: `【角色已有记忆】
${existingFormatted || '（暂无）'}

【本次角色真实感知的交流记录】
${args.transcript}`,
      schema: memoryDistillationSchema,
      temperature: 0.2,
      maxOutputTokens: 800,
    });

    for (const item of result.memories) {
      const isGrudge = item.kind === 'grudge' || item.emotionalWeight <= -0.4;
      // Write probability check based on forgetfulness & emotional significance
      const grudgeBoost = isGrudge ? char.grudgeRate * 0.7 : 0;
      const importanceBoost = item.importance * 0.4;
      const effectiveWriteChance = Math.min(1.0, profile.writeProbability + grudgeBoost + importanceBoost);

      if (Math.random() > effectiveWriteChance) {
        // Skipped due to forgetfulness/triviality
        continue;
      }

      if ((item.action === 'reinforce' || item.action === 'merge') && item.existingMemoryId) {
        const existing = existingRows.find((r) => r.id === item.existingMemoryId);
        if (existing) {
          const newCount = existing.reinforcementCount + 1;
          const newStrength = Math.min(1.0, existing.strength + 0.35);
          const newConfidence = Math.min(1.0, existing.confidence + 0.25);
          const newContent = item.action === 'merge' ? item.content : existing.content;

          await db
            .update(aiMemories)
            .set({
              content: newContent,
              kind: item.kind || existing.kind,
              strength: newStrength,
              confidence: newConfidence,
              importance: Math.max(existing.importance, item.importance),
              emotionalWeight: item.emotionalWeight,
              reinforcementCount: newCount,
              lastReinforcedAt: now,
              updatedAt: now,
            })
            .where(eq(aiMemories.id, existing.id));
          continue;
        }
      }

      // Create new memory entry
      const initialStrength = Math.min(1.0, 0.5 + item.importance * 0.3 + (isGrudge ? char.grudgeRate * 0.3 : 0));
      const initialConfidence = Math.min(1.0, profile.recallConfidenceBase + 0.1);

      await db.insert(aiMemories).values({
        id: crypto.randomUUID(),
        userId: args.userId,
        characterId: args.characterId,
        kind: item.kind,
        content: item.content,
        strength: initialStrength,
        confidence: initialConfidence,
        importance: item.importance,
        emotionalWeight: item.emotionalWeight,
        reinforcementCount: 1,
        sourceType: args.sourceType,
        sourceId: args.sourceId ?? null,
        lastReinforcedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Prune completely decayed memories to keep database tidy
    await pruneDecayedMemories(args.characterId, profile);
  } catch (err) {
    console.error('[consolidateMemories] failed:', err);
  }
}

/**
 * Periodically called maintenance: decreases strength of unused memories, removes deeply dead ones.
 */
export async function pruneDecayedMemories(characterId: string, profile?: ForgetfulnessConfig) {
  const [char] = await db
    .select({ memoryRetention: aiCharacters.memoryRetention, grudgeRate: aiCharacters.grudgeRate })
    .from(aiCharacters)
    .where(eq(aiCharacters.id, characterId))
    .limit(1);

  const prof = profile ?? getForgetfulnessProfile(char?.memoryRetention);
  const grudgeRate = char?.grudgeRate ?? 0.3;
  const now = new Date();

  const allMemories = await db
    .select()
    .from(aiMemories)
    .where(eq(aiMemories.characterId, characterId));

  const toDelete: string[] = [];
  const toUpdate: { id: string; strength: number; confidence: number }[] = [];

  for (const m of allMemories) {
    const decayed = calculateDecayedMemory(m, prof, grudgeRate, now);
    // If strength fell below 0.08 and hasn't been reinforced for long, prune it completely
    if (decayed.strength <= 0.08 && m.reinforcementCount <= 1 && m.importance < 0.6 && m.kind !== 'grudge') {
      toDelete.push(m.id);
    } else if (Math.abs(m.strength - decayed.strength) > 0.1 || Math.abs(m.confidence - decayed.confidence) > 0.1) {
      toUpdate.push({ id: m.id, strength: decayed.strength, confidence: decayed.confidence });
    }
  }

  if (toDelete.length > 0) {
    for (const id of toDelete) {
      await db.delete(aiMemories).where(eq(aiMemories.id, id));
    }
  }

  for (const u of toUpdate) {
    await db
      .update(aiMemories)
      .set({ strength: u.strength, confidence: u.confidence, updatedAt: now })
      .where(eq(aiMemories.id, u.id));
  }

  // Enforce memory cap (e.g. 50 max memories per character)
  const MAX_PER_CHAR = 50;
  await db.run(sql`
    DELETE FROM ai_memories WHERE character_id = ${characterId} AND id NOT IN (
      SELECT id FROM ai_memories WHERE character_id = ${characterId}
      ORDER BY importance DESC, strength DESC, last_reinforced_at DESC LIMIT ${MAX_PER_CHAR}
    )
  `);
}

/**
 * Backward compatible extractMemories wrapper for private chat tick
 */
export async function extractMemories(args: {
  userId: string;
  conversationId: string;
  characterId: string;
}) {
  const recent = (await getRecentMessages(args.conversationId, 12)).reverse();
  if (recent.length === 0) return;

  const transcript = recent
    .map((m) => {
      const text = m.content.trim();
      const atts = m.attachments && m.attachments.length > 0 ? formatAttachmentPromptBlock(m.attachments) : '';
      const combined = text && atts ? `${text}\n${atts}` : text || atts;
      return `${m.role === 'user' ? '用户' : '我'}：${combined}`;
    })
    .join('\n');

  await consolidateMemories({
    userId: args.userId,
    characterId: args.characterId,
    sourceType: 'dm',
    sourceId: args.conversationId,
    transcript,
  });
}
