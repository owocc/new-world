import { and, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { tool } from 'ai';
import { db } from '@/db';
import {
  aiCharacters,
  conversations,
  groupMembers,
  groupMessages,
  groups,
  messages,
  user,
} from '@/db/schema';
import { formatFullTime } from '@/server/ai/group/perception';

export interface HistorySearchParams {
  scope: 'current_conversation' | 'direct_message' | 'group' | 'all_accessible';
  query?: string;
  targetId?: string; // groupId or characterId/conversationId if targeting specific context
  startDate?: string; // ISO string or YYYY-MM-DD
  endDate?: string;   // ISO string or YYYY-MM-DD
  limit?: number;
}

export interface RecallItem {
  id: string;
  channelType: 'dm' | 'group';
  channelName: string;
  senderName: string;
  senderRole: string;
  content: string;
  timestamp: string;
  relativeTime: string;
}

/**
 * Historical Message Recall Service with strictly enforced access boundaries.
 * 
 * Rules:
 * 1. AI can only search Direct Messages between itself and the human user. It CANNOT read private chats between other characters or other users.
 * 2. AI can only search Group chats where it is a registered member (group_members).
 * 3. AI cannot see messages in a group sent after or before membership constraints, or from groups it has never been added to.
 */
export async function searchAccessibleHistory(args: {
  userId: string;
  characterId: string;
  currentGroupId?: string;
  currentConversationId?: string;
  search: HistorySearchParams;
  now?: Date;
}): Promise<{
  success: boolean;
  totalFound: number;
  results: RecallItem[];
  explanation: string;
}> {
  const now = args.now ?? new Date();
  const maxLimit = Math.min(20, Math.max(1, args.search.limit ?? 8));
  const queryPattern = args.search.query?.trim() ? `%${args.search.query.trim()}%` : null;

  let startTs: Date | null = null;
  if (args.search.startDate) {
    const d = new Date(args.search.startDate);
    if (!isNaN(d.getTime())) startTs = d;
  }

  let endTs: Date | null = null;
  if (args.search.endDate) {
    const d = new Date(args.search.endDate);
    if (!isNaN(d.getTime())) endTs = d;
  }

  const [char] = await db
    .select({ name: aiCharacters.name })
    .from(aiCharacters)
    .where(eq(aiCharacters.id, args.characterId))
    .limit(1);
  const charName = char?.name || '我';

  const [humanUser] = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, args.userId))
    .limit(1);
  const humanName = humanUser?.name || '用户';

  const collected: RecallItem[] = [];

  // 1. Direct Messages (DM) Search (Only DMs where characterId matches)
  if (
    args.search.scope === 'current_conversation' ||
    args.search.scope === 'direct_message' ||
    args.search.scope === 'all_accessible'
  ) {
    const dmConditions = [
      eq(conversations.userId, args.userId),
      eq(conversations.characterId, args.characterId),
    ];
    if (args.currentConversationId && args.search.scope === 'current_conversation') {
      dmConditions.push(eq(conversations.id, args.currentConversationId));
    }

    const dmConvs = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(...dmConditions));

    const convIds = dmConvs.map((c) => c.id);

    if (convIds.length > 0) {
      const msgConditions = [inArray(messages.conversationId, convIds)];
      if (queryPattern) msgConditions.push(like(messages.content, queryPattern));
      if (startTs) msgConditions.push(gte(messages.createdAt, startTs));
      if (endTs) msgConditions.push(lte(messages.createdAt, endTs));

      const dmMsgRows = await db
        .select({
          id: messages.id,
          role: messages.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(and(...msgConditions))
        .orderBy(desc(messages.createdAt))
        .limit(maxLimit);

      for (const m of dmMsgRows) {
        const msgDate = new Date(m.createdAt);
        collected.push({
          id: m.id,
          channelType: 'dm',
          channelName: `私聊 (你与${humanName})`,
          senderName: m.role === 'user' ? humanName : charName,
          senderRole: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
          timestamp: formatFullTime(msgDate, 'Asia/Shanghai'),
          relativeTime: formatRelativeDateDiff(msgDate, now),
        });
      }
    }
  }

  // 2. Group Messages Search (Only groups this AI has joined)
  if (
    args.search.scope === 'group' ||
    args.search.scope === 'all_accessible' ||
    (args.search.scope === 'current_conversation' && args.currentGroupId)
  ) {
    const memberConditions = [
      eq(groupMembers.userId, args.userId),
      eq(groupMembers.characterId, args.characterId),
    ];
    if (args.currentGroupId && (args.search.scope === 'current_conversation' || args.search.targetId === args.currentGroupId)) {
      memberConditions.push(eq(groupMembers.groupId, args.currentGroupId));
    } else if (args.search.targetId) {
      memberConditions.push(eq(groupMembers.groupId, args.search.targetId));
    }

    const memberRows = await db
      .select({
        groupId: groupMembers.groupId,
        joinedAt: groupMembers.joinedAt,
      })
      .from(groupMembers)
      .where(and(...memberConditions));

    const allowedGroupIds = memberRows.map((r) => r.groupId);

    if (allowedGroupIds.length > 0) {
      // Fetch group details for naming
      const groupRows = await db
        .select({ id: groups.id, name: groups.name })
        .from(groups)
        .where(inArray(groups.id, allowedGroupIds));
      const groupMap = new Map(groupRows.map((g) => [g.id, g.name]));

      const groupMsgConditions = [inArray(groupMessages.groupId, allowedGroupIds)];
      if (queryPattern) groupMsgConditions.push(like(groupMessages.content, queryPattern));
      if (startTs) groupMsgConditions.push(gte(groupMessages.createdAt, startTs));
      if (endTs) groupMsgConditions.push(lte(groupMessages.createdAt, endTs));

      const groupMsgRows = await db
        .select({
          id: groupMessages.id,
          groupId: groupMessages.groupId,
          senderType: groupMessages.senderType,
          senderCharacterId: groupMessages.senderCharacterId,
          content: groupMessages.content,
          createdAt: groupMessages.createdAt,
        })
        .from(groupMessages)
        .where(and(...groupMsgConditions))
        .orderBy(desc(groupMessages.createdAt))
        .limit(maxLimit);

      // Resolve character senders
      const senderCharIds = groupMsgRows
        .filter((m) => m.senderType === 'ai' && m.senderCharacterId)
        .map((m) => m.senderCharacterId as string);

      const senderChars = senderCharIds.length > 0
        ? await db
            .select({ id: aiCharacters.id, name: aiCharacters.name })
            .from(aiCharacters)
            .where(inArray(aiCharacters.id, senderCharIds))
        : [];
      const senderMap = new Map(senderChars.map((c) => [c.id, c.name]));

      for (const gm of groupMsgRows) {
        const msgDate = new Date(gm.createdAt);
        const groupName = groupMap.get(gm.groupId) || '群聊';
        const senderName =
          gm.senderType === 'user'
            ? humanName
            : senderMap.get(gm.senderCharacterId || '') || (gm.senderCharacterId === args.characterId ? charName : '群成员');

        collected.push({
          id: gm.id,
          channelType: 'group',
          channelName: `群聊「${groupName}」`,
          senderName,
          senderRole: gm.senderType,
          content: gm.content,
          timestamp: formatFullTime(msgDate, 'Asia/Shanghai'),
          relativeTime: formatRelativeDateDiff(msgDate, now),
        });
      }
    }
  }

  // Sort by date descending and limit
  collected.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const finalResults = collected.slice(0, maxLimit);

  return {
    success: true,
    totalFound: finalResults.length,
    results: finalResults,
    explanation:
      finalResults.length > 0
        ? `翻找到了 ${finalResults.length} 条相关历史记录`
        : '没有找到匹配的历史记录（可能未曾聊过该话题或关键词不匹配）',
  };
}

function formatRelativeDateDiff(target: Date, now: Date): string {
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.round((nowDay - targetDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays === 2) return '前天';
  if (diffDays >= 3 && diffDays <= 7) return `${diffDays} 天前（上周）`;
  if (diffDays > 7 && diffDays <= 30) return `${Math.floor(diffDays / 7)} 周前`;
  return `${diffDays} 天前`;
}

/**
 * Creates an AI Tool definition for recalling past chat history.
 * Suitable for function calling in LLM execution.
 */
export function createHistoryRecallTool(context: {
  userId: string;
  characterId: string;
  currentGroupId?: string;
  currentConversationId?: string;
}) {
  const recallParameters = z.object({
    query: z.string().optional().describe('检索关键词或主题（例如“面试”、“拉面”、“周五吃饭”），留空则按时间范围检索'),
    scope: z
      .enum(['current_conversation', 'direct_message', 'group', 'all_accessible'])
      .default('all_accessible')
      .describe('搜索范围：current_conversation(当前会话); direct_message(私聊记录); group(群聊记录); all_accessible(全部有权访问的记录)'),
    startDate: z
      .string()
      .optional()
      .describe('开始日期 (ISO 格式或 YYYY-MM-DD)，如需查“昨天”或“上周”请传入对应计算后的日期'),
    endDate: z
      .string()
      .optional()
      .describe('结束日期 (ISO 格式或 YYYY-MM-DD)'),
    limit: z.number().int().min(1).max(15).default(6).describe('期望返回的记录条数'),
  });

  return (tool as any)({
    description: `查阅和检索你与用户的历史私聊记录，或者你参与过的群聊历史记录。
【调用时机约束】：
1. 只有当用户明确质问/提示过去事件（如“我昨天不是跟你说过吗？”、“你还记得上次聊的吗？”）且你确实没有在当前上下文或记忆中找到时，才调用本工具。
2. 如果当前对话正在自然进行，或者你已经能直接接话，切勿滥用或随意触发翻查。
3. 翻查后以自然的日常口语回复，绝对不要提及工具名或数据库。`,
    parameters: recallParameters,
    execute: async (args: any) => {
      const searchRes = await searchAccessibleHistory({
        userId: context.userId,
        characterId: context.characterId,
        currentGroupId: context.currentGroupId,
        currentConversationId: context.currentConversationId,
        search: {
          scope: args?.scope,
          query: args?.query,
          startDate: args?.startDate,
          endDate: args?.endDate,
          limit: args?.limit,
        },
      });

      if (searchRes.results.length === 0) {
        return {
          found: false,
          message: '未翻找到相关聊天记录。你可以向用户表示有些淡忘并坦诚询问。',
          records: [],
        };
      }

      return {
        found: true,
        message: `翻到了 ${searchRes.results.length} 条记录：`,
        records: searchRes.results.map((r) => ({
          channel: r.channelName,
          sender: r.senderName,
          time: `${r.relativeTime} (${r.timestamp})`,
          content: r.content,
        })),
      };
    },
  });
}
