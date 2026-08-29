import { z } from 'zod';
import { db } from '@/db';
import { aiMemories, groupMessages, user } from '@/db/schema';
import { runObject } from '@/server/ai/core';
import type { AiCharacter, GroupDecisionResult, PerceptionContext } from './types';
import { calculateTopicAffinity, isWithinActiveHours, resolveSocialProfile } from './profile';
import {
  GROUP_DECISION_SCHEMA_INSTRUCTION,
  buildGroupDecisionSystemPrompt,
  formatGroupChatContextBlock,
  formatTimeAwarenessBlock,
} from './prompts';
import { and, desc, eq } from 'drizzle-orm';

const decisionSchema = z.object({
  action: z.enum(['none', 'react', 'reply', 'multi_message']).default('none'),
  reasoning: z.string().optional(),
  targetMessageId: z.string().optional().nullable(),
  reactionEmoji: z.string().optional().nullable(),
  replyContent: z.string().optional().nullable(),
  multiMessages: z.array(z.string()).optional().nullable(),
  shouldFormMemory: z.boolean().optional().default(false),
  memoryFact: z.string().optional().nullable(),
  memoryImportance: z.number().min(0).max(1).optional().default(0.6),
});

/**
 * Make a group chat engagement decision for an AI.
 * Employs deterministic pre-filtering to save tokens and prevent infinite AI reply storms.
 */
export async function makeGroupDecision(
  userId: string,
  character: AiCharacter,
  ctx: PerceptionContext,
  opts: { forceEngage?: boolean } = {},
): Promise<GroupDecisionResult> {
  const profile = resolveSocialProfile(character);

  // 1. Zero unread messages -> nothing to do
  if (ctx.unreadCount === 0 && !opts.forceEngage) {
    return { action: 'none', reasoning: '无未读消息' };
  }

  // 2. Active hours check
  const isActive = isWithinActiveHours(profile, new Date(), ctx.timezone);
  if (!isActive && !ctx.isMentioned && !opts.forceEngage) {
    return { action: 'none', reasoning: '非活跃作息时段，默默潜水' };
  }

  // 3. Anti-Loop Storm Protection
  // Check the last few messages in the group to avoid endless AI-to-AI ping-pong
  const recentMsgs = await db
    .select({
      id: groupMessages.id,
      senderType: groupMessages.senderType,
      senderCharacterId: groupMessages.senderCharacterId,
      createdAt: groupMessages.createdAt,
    })
    .from(groupMessages)
    .where(eq(groupMessages.groupId, ctx.group.id))
    .orderBy(desc(groupMessages.createdAt))
    .limit(5);

  let consecutiveAiCount = 0;
  for (const m of recentMsgs) {
    if (m.senderType === 'ai') {
      consecutiveAiCount++;
    } else {
      break;
    }
  }

  // If already 2+ consecutive AI messages without user participation, aggressively throttle further AI messages
  if (consecutiveAiCount >= 2 && !ctx.isMentioned && !ctx.isDirectlyReplied && !opts.forceEngage) {
    // 85% chance to stay quiet, 10% chance for emoji reaction, 5% chance to wrap up
    const roll = Math.random();
    if (roll < 0.85) {
      return { action: 'none', reasoning: 'AI 对话轮次保护：暂不抢话' };
    } else if (roll < 0.95) {
      const emoji = profile.preferredEmojis[Math.floor(Math.random() * profile.preferredEmojis.length)] || '👍';
      const targetId = recentMsgs[0]?.id;
      return {
        action: 'react',
        reactionEmoji: emoji,
        targetMessageId: targetId,
        reasoning: 'AI 对话保护：随手点个表情互动',
      };
    }
  }

  // 4. Deterministic Interest & Probability Filter
  // If not mentioned, not directly replied, and topic affinity is low -> check random roll against reply/reaction rates
  if (!ctx.isMentioned && !ctx.isDirectlyReplied && !opts.forceEngage) {
    const unreadText = ctx.unreadDigest.keyMessages.map((m) => m.content).join(' ');
    const affinity = calculateTopicAffinity(profile, unreadText);

    const baseChance = profile.replyProbability + profile.reactionProbability + affinity * 0.4;
    if (Math.random() > Math.min(0.9, baseChance)) {
      // Deterministic silent reading! No LLM call needed!
      return { action: 'none', reasoning: '确定性过滤：不感兴趣或选择潜水' };
    }
  }

  // 5. Fetch Character Memories for Knowledge Grounding
  const memoryRows = await db
    .select({ content: aiMemories.content })
    .from(aiMemories)
    .where(and(eq(aiMemories.characterId, character.id), eq(aiMemories.userId, userId)))
    .orderBy(desc(aiMemories.importance), desc(aiMemories.createdAt))
    .limit(8);
  const memories = memoryRows.map((m) => m.content);

  const [humanUser] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const humanName = humanUser?.name || '你';

  // 6. Build Prompt
  const systemPrompt = buildGroupDecisionSystemPrompt(character, humanName, memories);
  const timeBlock = formatTimeAwarenessBlock(ctx);
  const contextBlock = formatGroupChatContextBlock(ctx);

  const userPrompt = `${timeBlock}\n\n${contextBlock}\n\n${GROUP_DECISION_SCHEMA_INSTRUCTION}`;

  try {
    const result = await runObject({
      userId,
      characterId: character.id,
      callType: 'group_decision',
      schema: decisionSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: character.temperature ?? 0.75,
    });

    // Post-process / normalize result
    const latestKeyMsg = ctx.unreadDigest.keyMessages[ctx.unreadDigest.keyMessages.length - 1];
    const fallbackTargetId = latestKeyMsg?.id;

    if (result.action === 'react') {
      const emoji =
        result.reactionEmoji ||
        profile.preferredEmojis[Math.floor(Math.random() * profile.preferredEmojis.length)] ||
        '👍';
      return {
        action: 'react',
        targetMessageId: result.targetMessageId || fallbackTargetId,
        reactionEmoji: emoji,
        reasoning: result.reasoning,
        shouldFormMemory: result.shouldFormMemory,
        memoryFact: result.memoryFact ?? undefined,
      };
    }

    if (result.action === 'reply' && result.replyContent) {
      return {
        action: 'reply',
        replyContent: result.replyContent.trim(),
        targetMessageId: result.targetMessageId ?? undefined,
        reasoning: result.reasoning,
        shouldFormMemory: result.shouldFormMemory,
        memoryFact: result.memoryFact ?? undefined,
      };
    }

    if (result.action === 'multi_message' && result.multiMessages && result.multiMessages.length > 0) {
      return {
        action: 'multi_message',
        multiMessages: result.multiMessages.map((m) => m.trim()).filter(Boolean),
        targetMessageId: result.targetMessageId ?? undefined,
        reasoning: result.reasoning,
        shouldFormMemory: result.shouldFormMemory,
        memoryFact: result.memoryFact ?? undefined,
      };
    }

    return {
      action: 'none',
      reasoning: result.reasoning || '决定不发言',
      shouldFormMemory: result.shouldFormMemory,
      memoryFact: result.memoryFact ?? undefined,
    };
  } catch (err) {
    console.error(`[group-decision] error for ${character.name}:`, err);
    return { action: 'none', reasoning: '决策模型调用异常，降级为静默阅读' };
  }
}
