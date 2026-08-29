import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { aiMemories, conversations, messages } from '@/db/schema';
import { getMediaForMessages, type MediaAssetView } from '@/server/media';
import { runObject, runText } from './core';

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
    attachments: mediaMap.get(r.id) ?? [],
  }));
}

export async function getMemories(characterId: string, limit = 10) {
  const rows = await db
    .select()
    .from(aiMemories)
    .where(eq(aiMemories.characterId, characterId))
    .orderBy(desc(aiMemories.importance), desc(aiMemories.createdAt))
    .limit(limit);
  return rows.map((r) => r.content);
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
 * fold the older half into the conversation summary (one cheap call).
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

  // summarize everything except the last CONTEXT_WINDOW messages
  const toSummarizeUpto = count - CONTEXT_WINDOW;
  if (toSummarizeUpto <= conv.summarizedCount) return;

  const rows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.conversationId, args.conversationId), gt(messages.createdAt, new Date(0))))
    .orderBy(messages.createdAt)
    .limit(toSummarizeUpto - conv.summarizedCount)
    .offset(conv.summarizedCount);

  if (rows.length === 0) return;

  const msgIds = rows.map((r) => r.id);
  const mediaMap = await getMediaForMessages(msgIds);
  const transcript = rows
    .map((m) => {
      let text = m.content.trim();
      const atts = mediaMap.get(m.id);
      if (atts && atts.length > 0) {
        const summaries = atts
          .map((a) => a.perception?.summary)
          .filter((s): s is string => Boolean(s && s.trim()));
        if (summaries.length > 0) {
          const note = summaries.map((s, idx) => (summaries.length > 1 ? `[图${idx + 1}: ${s}]` : `[图片: ${s}]`)).join(' ');
          text = text ? `${text} ${note}` : note;
        } else {
          text = text ? `${text} [发送了图片]` : '[发送了图片]';
        }
      }
      return `${m.role === 'user' ? '用户' : '我'}：${text}`;
    })
    .join('\n');
  const previous = conv.summary ? `之前的摘要：\n${conv.summary}\n\n` : '';

  const summary = await runText({
    userId: args.userId,
    characterId: conv.characterId,
    callType: 'summary',
    system:
      '你是对话摘要器。把聊天记录压缩成简洁的要点摘要，保留：重要事实、用户的偏好、承诺过的事、情绪基调。300字以内。直接输出摘要。',
    prompt: previous + '新增对话：\n' + transcript,
    temperature: 0.3,
    maxOutputTokens: 500,
  });

  await db
    .update(conversations)
    .set({ summary, summarizedCount: toSummarizeUpto })
    .where(eq(conversations.id, args.conversationId));
}

const memorySchema = z.object({
  memories: z
    .array(
      z.object({
        kind: z.enum(['fact', 'preference', 'event']),
        content: z.string().describe('一句话记忆，第三人称'),
        importance: z.number().min(0).max(1),
      }),
    )
    .max(5)
    .describe('值得长期记住的信息；没有则返回空数组'),
});

/**
 * Periodically distill durable memories about the user from a chat.
 * Called every N user messages; cheap structured call.
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
      let text = m.content.trim();
      if (m.attachments && m.attachments.length > 0) {
        const summaries = m.attachments
          .map((a) => a.perception?.summary)
          .filter((s): s is string => Boolean(s && s.trim()));
        if (summaries.length > 0) {
          const note = summaries.map((s, idx) => (summaries.length > 1 ? `[图${idx + 1}: ${s}]` : `[图片: ${s}]`)).join(' ');
          text = text ? `${text} ${note}` : note;
        } else {
          text = text ? `${text} [发送了图片]` : '[发送了图片]';
        }
      }
      return `${m.role === 'user' ? '用户' : '我'}：${text}`;
    })
    .join('\n');

  const existing = await getMemories(args.characterId, 30);

  const result = await runObject({
    userId: args.userId,
    characterId: args.characterId,
    callType: 'memory',
    system:
      '你从聊天记录中提取值得长期记忆的信息（用户喜好、事实、重要事件）。已有记忆列表仅供参考，避免重复。没有新信息就返回空数组。',
    prompt: `已有记忆：\n${existing.join('\n') || '（无）'}\n\n聊天记录：\n${transcript}`,
    schema: memorySchema,
    temperature: 0.2,
    maxOutputTokens: 600,
  });

  for (const mem of result.memories) {
    await db.insert(aiMemories).values({
      id: crypto.randomUUID(),
      userId: args.userId,
      characterId: args.characterId,
      kind: mem.kind,
      content: mem.content,
      importance: mem.importance,
    });
  }

  // cap memories to keep token usage bounded
  const MEMORIES_CAP = 40;
  await db.run(sql`
    DELETE FROM ai_memories WHERE character_id = ${args.characterId} AND id NOT IN (
      SELECT id FROM ai_memories WHERE character_id = ${args.characterId}
      ORDER BY importance DESC, created_at DESC LIMIT ${MEMORIES_CAP}
    )
  `);
}
