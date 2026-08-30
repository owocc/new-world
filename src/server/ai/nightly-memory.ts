import { and, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, aiMemories, conversations, groupMembers, groupMessages, groups, messages, user } from '@/db/schema';
import { consolidateMemories, pruneDecayedMemories } from '@/server/ai/memory';

export type MemorySummaryType = 'automatic' | 'manual';

/**
 * Get start and end dates for the Shanghai calendar day containing targetDate.
 */
export function getShanghaiDayRange(targetDate: Date = new Date()): { startOfDay: Date; endOfDay: Date } {
  // Compute local midnight in Asia/Shanghai
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // 'YYYY-MM-DD'
  const dateStr = formatter.format(targetDate);
  
  // Shanghai is UTC+8, so YYYY-MM-DDT00:00:00+08:00
  const startOfDay = new Date(`${dateStr}T00:00:00+08:00`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999+08:00`);

  return { startOfDay, endOfDay };
}

function getSummaryDayRange(type: MemorySummaryType, targetDate: Date) {
  if (type === 'manual') {
    return getShanghaiDayRange(targetDate);
  }

  const { startOfDay } = getShanghaiDayRange(targetDate);
  return getShanghaiDayRange(new Date(startOfDay.getTime() - 1));
}

/**
 * Perform nightly memory distillation for all active AI characters across all users.
 * Automatic runs summarize the completed previous Shanghai calendar day.
 */
export async function summarizeDailyMemoriesForAllCharacters(options?: {
  targetDate?: Date;
  type?: MemorySummaryType;
}) {
  const targetDate = options?.targetDate ?? new Date();
  const type = options?.type ?? 'automatic';
  const { startOfDay, endOfDay } = getSummaryDayRange(type, targetDate);

  const characters = await db
    .select()
    .from(aiCharacters)
    .where(eq(aiCharacters.status, 'active'));

  const results: { characterId: string; characterName: string; dmCount: number; groupCount: number }[] = [];

  for (const char of characters) {
    let dmMessageCount = 0;
    let groupMessageCount = 0;

    // 1. Fetch DM messages in the summary day
    const [conv] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.userId, char.userId), eq(conversations.characterId, char.id)))
      .limit(1);

    if (conv) {
      const dmMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            gte(messages.createdAt, startOfDay),
            lte(messages.createdAt, endOfDay),
          ),
        )
        .orderBy(messages.createdAt);

      if (dmMessages.length > 0) {
        dmMessageCount = dmMessages.length;
        const dmTranscript = dmMessages
          .map((m) => {
            const sender = m.role === 'user' ? '用户' : m.role === 'system' ? '系统提示' : char.name;
            return `[${m.createdAt.toISOString()}] ${sender}: ${m.content}`;
          })
          .join('\n');

        await consolidateMemories({
          userId: char.userId,
          characterId: char.id,
          sourceType: 'dm',
          sourceId: conv.id,
          transcript: `【私聊记录】\n${dmTranscript}`,
          now: targetDate,
        });
      }
    }

    // 2. Fetch group messages in the summary day
    const memberGroups = await db
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(and(eq(groupMembers.characterId, char.id), eq(groupMembers.memberType, 'ai')));

    if (memberGroups.length > 0) {
      const groupIds = memberGroups.map((g) => g.groupId);
      const groupMsgs = await db
        .select({
          msg: groupMessages,
          groupName: groups.name,
        })
        .from(groupMessages)
        .innerJoin(groups, eq(groupMessages.groupId, groups.id))
        .where(
          and(
            inArray(groupMessages.groupId, groupIds),
            gte(groupMessages.createdAt, startOfDay),
            lte(groupMessages.createdAt, endOfDay),
          ),
        )
        .orderBy(groupMessages.createdAt);

      if (groupMsgs.length > 0) {
        groupMessageCount = groupMsgs.length;
        const groupTranscript = groupMsgs
          .map(({ msg, groupName }) => {
            const sender = msg.senderType === 'user' ? '用户' : msg.senderType === 'system' ? '系统提示' : '群成员';
            return `[群聊: ${groupName}] [${msg.createdAt.toISOString()}] ${sender}: ${msg.content}`;
          })
          .join('\n');

        await consolidateMemories({
          userId: char.userId,
          characterId: char.id,
          sourceType: 'group',
          transcript: `【群聊记录】\n${groupTranscript}`,
          now: targetDate,
        });
      }
    }

    // 3. Run memory retention maintenance (decay & pruning)
    await pruneDecayedMemories(char.id);

    results.push({
      characterId: char.id,
      characterName: char.name,
      dmCount: dmMessageCount,
      groupCount: groupMessageCount,
    });
  }

  return {
    type,
    dateRange: { startOfDay, endOfDay },
    processedCount: characters.length,
    characters: results,
  };
}

/**
 * Trigger memory distillation for one AI character.
 * Manual runs summarize the current Shanghai calendar day.
 */
export async function summarizeDailyMemoriesForSingleCharacter(
  userId: string,
  characterId: string,
  options?: { targetDate?: Date; type?: MemorySummaryType },
) {
  const targetDate = options?.targetDate ?? new Date();
  const type = options?.type ?? 'manual';
  const { startOfDay, endOfDay } = getSummaryDayRange(type, targetDate);

  const [char] = await db
    .select()
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, characterId), eq(aiCharacters.userId, userId)))
    .limit(1);

  if (!char) {
    throw new Error('AI 角色不存在');
  }
  let dmMessageCount = 0;
  let groupMessageCount = 0;

  // 1. Fetch DM messages in the summary day
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.characterId, characterId)))
    .limit(1);
  if (conv) {
    const dmMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conv.id),
          gte(messages.createdAt, startOfDay),
          lte(messages.createdAt, endOfDay),
        ),
      )
      .orderBy(messages.createdAt);

    if (dmMessages.length > 0) {
      dmMessageCount = dmMessages.length;
      const dmTranscript = dmMessages
        .map((m) => {
          const sender = m.role === 'user' ? '用户' : m.role === 'system' ? '系统提示' : char.name;
          return `[${m.createdAt.toISOString()}] ${sender}: ${m.content}`;
        })
        .join('\n');

      await consolidateMemories({
        userId,
        characterId,
        sourceType: 'dm',
        sourceId: conv.id,
        transcript: `【私聊记录】\n${dmTranscript}`,
        now: targetDate,
        throwOnError: type === 'manual',
      });
    }
  }
  // 2. Fetch group messages in the summary day
  const memberGroups = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(and(eq(groupMembers.characterId, characterId), eq(groupMembers.memberType, 'ai')));

  if (memberGroups.length > 0) {
    const groupIds = memberGroups.map((g) => g.groupId);
    const groupMsgs = await db
      .select({
        msg: groupMessages,
        groupName: groups.name,
      })
      .from(groupMessages)
      .innerJoin(groups, eq(groupMessages.groupId, groups.id))
      .where(
        and(
          inArray(groupMessages.groupId, groupIds),
          gte(groupMessages.createdAt, startOfDay),
          lte(groupMessages.createdAt, endOfDay),
        ),
      )
      .orderBy(groupMessages.createdAt);

    if (groupMsgs.length > 0) {
      groupMessageCount = groupMsgs.length;
      const groupTranscript = groupMsgs
        .map(({ msg, groupName }) => {
          const sender = msg.senderType === 'user' ? '用户' : msg.senderType === 'system' ? '系统提示' : '群成员';
          return `[群聊: ${groupName}] [${msg.createdAt.toISOString()}] ${sender}: ${msg.content}`;
        })
        .join('\n');

      await consolidateMemories({
        userId,
        characterId,
        sourceType: 'group',
        transcript: `【群聊记录】\n${groupTranscript}`,
        now: targetDate,
        throwOnError: type === 'manual',
      });
    }
  }
  const memoryCount = (
    await db
      .select({ id: aiMemories.id })
      .from(aiMemories)
      .where(and(eq(aiMemories.characterId, characterId), eq(aiMemories.userId, userId)))
  ).length;

  return {
    type,
    characterId,
    characterName: char.name,
    dmCount: dmMessageCount,
    groupCount: groupMessageCount,
    memoryCount,
    dateRange: { startOfDay, endOfDay },
  };
}
