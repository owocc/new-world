import { and, asc, desc, eq, gt, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, groupMembers, groupMessages, groupReactions, groups, user } from '@/db/schema';
import type { AiCharacter, GroupMemberRow, GroupMessageRow, PerceptionContext } from './types';
import { calculateTopicAffinity, resolveSocialProfile } from './profile';

/**
 * Format relative time duration in friendly natural Chinese.
 */
export function formatTimeElapsed(fromMs: number, toMs: number): string {
  const diffSec = Math.max(0, Math.floor((toMs - fromMs) / 1000));
  if (diffSec < 30) return '刚刚 (半分钟内)';
  if (diffSec < 60) return `${diffSec} 秒前`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  const remMin = diffMin % 60;
  if (diffHour < 24) {
    return remMin > 0 ? `${diffHour} 小时 ${remMin} 分钟前` : `${diffHour} 小时前`;
  }
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return '昨天';
  if (diffDay < 7) return `${diffDay} 天前`;
  return `${Math.floor(diffDay / 7)} 周前`;
}

/**
 * Format real-world timestamp with weekday and period of day.
 */
export function formatFullTime(date: Date, timezone = 'Asia/Shanghai'): string {
  const dtf = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'long',
    hour12: false,
  });
  return dtf.format(date);
}

/**
 * Parse mentions JSON from message.
 */
function parseMentions(raw: string | null): { type: string; id: string; name: string; username: string }[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Build Perception Context for an AI member in a group.
 * Strictly respects the AI's reading cursor (lastReadAt & lastReadMessageId).
 */
export async function buildPerceptionContext(
  userId: string,
  groupId: string,
  character: AiCharacter,
  member: GroupMemberRow,
  timezone = 'Asia/Shanghai',
): Promise<PerceptionContext | null> {
  const now = new Date();

  // Fetch group info
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
    .limit(1);
  if (!group) return null;

  // Fetch all members of this group
  const allMembers = await db
    .select({
      id: groupMembers.id,
      memberType: groupMembers.memberType,
      characterId: groupMembers.characterId,
      role: groupMembers.role,
      characterName: aiCharacters.name,
      characterUsername: aiCharacters.username,
    })
    .from(groupMembers)
    .leftJoin(aiCharacters, eq(groupMembers.characterId, aiCharacters.id))
    .where(eq(groupMembers.groupId, groupId));

  const [humanUser] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  const humanName = humanUser?.name || '你';
  const membersSummary = allMembers
    .map((m) =>
      m.memberType === 'user'
        ? `${humanName} (真人用户)`
        : `${m.characterName || 'AI'} (@${m.characterUsername || 'ai'})`,
    )
    .join(', ');

  // Determine last read anchor
  const lastReadAt = member.lastReadAt ? new Date(member.lastReadAt) : null;

  // Fetch unread messages
  let unreadQuery;
  if (lastReadAt) {
    unreadQuery = db
      .select()
      .from(groupMessages)
      .where(and(eq(groupMessages.groupId, groupId), gt(groupMessages.createdAt, lastReadAt)))
      .orderBy(asc(groupMessages.createdAt));
  } else {
    // If character never read, take up to last 15 messages as unread batch
    unreadQuery = db
      .select()
      .from(groupMessages)
      .where(eq(groupMessages.groupId, groupId))
      .orderBy(asc(groupMessages.createdAt))
      .limit(15);
  }

  const unreadRows = await unreadQuery;

  // Preceding messages for context continuity (last 4 messages before lastReadAt)
  let precedingRows: GroupMessageRow[] = [];
  if (lastReadAt) {
    precedingRows = await db
      .select()
      .from(groupMessages)
      .where(and(eq(groupMessages.groupId, groupId), lte(groupMessages.createdAt, lastReadAt)))
      .orderBy(desc(groupMessages.createdAt))
      .limit(4);
    precedingRows.reverse();
  }

  // Fetch reactions for all relevant messages
  const allMsgIds = [...precedingRows, ...unreadRows].map((m) => m.id);
  const reactionsMap = new Map<string, { emoji: string; reactorName: string }[]>();

  if (allMsgIds.length > 0) {
    const rxRows = await db
      .select({
        messageId: groupReactions.messageId,
        emoji: groupReactions.emoji,
        reactorType: groupReactions.reactorType,
        characterName: aiCharacters.name,
      })
      .from(groupReactions)
      .leftJoin(aiCharacters, eq(groupReactions.characterId, aiCharacters.id))
      .where(inArray(groupReactions.messageId, allMsgIds));

    for (const rx of rxRows) {
      const list = reactionsMap.get(rx.messageId) ?? [];
      const reactorName = rx.reactorType === 'user' ? humanName : rx.characterName || 'AI';
      list.push({ emoji: rx.emoji, reactorName });
      reactionsMap.set(rx.messageId, list);
    }
  }

  // Map of characters for name resolution
  const characterMap = new Map(allMembers.filter((m) => m.characterId).map((m) => [m.characterId!, m]));

  const formatMsg = (m: GroupMessageRow) => {
    const isSelf = m.senderCharacterId === character.id;
    const isUser = m.senderType === 'user';
    const senderChar = m.senderCharacterId ? characterMap.get(m.senderCharacterId) : null;
    const senderName = isUser ? humanName : senderChar?.characterName || '某人';
    const senderUsername = isUser ? 'me' : senderChar?.characterUsername || 'user';

    const mentions = parseMentions(m.mentions);
    const isMentioningMe = mentions.some(
      (men) =>
        (men.type === 'ai' && (men.id === character.id || men.username === character.username)) ||
        m.content.includes(`@${character.name}`) ||
        m.content.includes(`@${character.username}`),
    );

    return {
      id: m.id,
      senderName,
      senderUsername,
      isSelf,
      isUser,
      content: m.content,
      timeFormatted: formatFullTime(new Date(m.createdAt), timezone),
      isMentioningMe,
      isReplyingToMe: false, // will update below
      replyQuote: undefined as string | undefined,
      reactions: reactionsMap.get(m.id) || [],
    };
  };

  const precedingMessages = precedingRows.map(formatMsg);

  // Analyze unread batch
  let isMentioned = false;
  let isDirectlyReplied = false;
  const profile = resolveSocialProfile(character);

  const formattedUnreads = unreadRows.map((m) => {
    const formatted = formatMsg(m);
    if (formatted.isMentioningMe) isMentioned = true;

    // Check if this message replies to one of this AI's messages
    if (m.replyToMessageId) {
      const parent = [...precedingRows, ...unreadRows].find((p) => p.id === m.replyToMessageId);
      if (parent) {
        if (parent.senderCharacterId === character.id) {
          formatted.isReplyingToMe = true;
          isDirectlyReplied = true;
        }
        const pSender = parent.senderType === 'user' ? humanName : characterMap.get(parent.senderCharacterId!)?.characterName || '某人';
        formatted.replyQuote = `回复「${pSender}」: ${parent.content.slice(0, 40)}`;
      }
    }

    return formatted;
  });

  // Group Digest generation if unread backlog > 12 messages
  const unreadCount = formattedUnreads.length;
  let keyMessages = formattedUnreads;
  let summaryText: string | undefined = undefined;

  if (unreadCount > 12) {
    // Large backlog: Select key messages & summarize older noise
    const keySet = new Set<string>();

    // 1. Direct mentions & replies to me
    formattedUnreads.forEach((m) => {
      if (m.isMentioningMe || m.isReplyingToMe) keySet.add(m.id);
    });

    // 2. Recent 5 messages always preserved verbatim
    formattedUnreads.slice(-5).forEach((m) => keySet.add(m.id));

    // 3. User messages preserved (up to 3 most recent user messages)
    formattedUnreads
      .filter((m) => m.isUser)
      .slice(-3)
      .forEach((m) => keySet.add(m.id));

    // 4. Topic affinity matches
    formattedUnreads.forEach((m) => {
      if (calculateTopicAffinity(profile, m.content) >= 0.3) {
        keySet.add(m.id);
      }
    });

    // Extract older non-key messages into summary breakdown
    const olderBacklog = formattedUnreads.slice(0, -5).filter((m) => !keySet.has(m.id));
    if (olderBacklog.length > 0) {
      const authorCounts = new Map<string, number>();
      olderBacklog.forEach((m) => {
        authorCounts.set(m.senderName, (authorCounts.get(m.senderName) || 0) + 1);
      });
      const topAuthors = Array.from(authorCounts.entries())
        .map(([name, cnt]) => `${name} (${cnt}条)`)
        .join('、');

      summaryText = `在你未查看期间，群里产生了 ${unreadCount} 条消息。其中较早的 ${olderBacklog.length} 条日常聊天由 ${topAuthors} 发送，已自动为你折叠概括。以下保留了与你相关的关键消息和最新动态：`;
    }

    keyMessages = formattedUnreads.filter((m) => keySet.has(m.id));
  }

  const lastReadAtFormatted = lastReadAt ? formatFullTime(lastReadAt, timezone) : '从未查看 (刚加入)';
  const timeSinceLastRead = lastReadAt
    ? formatTimeElapsed(lastReadAt.getTime(), now.getTime())
    : '首次阅读';

  return {
    currentTimeFormatted: formatFullTime(now, timezone),
    timezone,
    lastReadAtFormatted,
    timeSinceLastRead,
    unreadCount,
    isMentioned,
    isDirectlyReplied,
    precedingMessages,
    unreadDigest: {
      summaryText,
      keyMessages,
    },
    group: {
      id: group.id,
      name: group.name,
      description: group.description || '',
      memberCount: allMembers.length,
      membersSummary,
    },
  };
}
