import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { aiMemories, groupAttentionEvents, groupMembers, groupMessages, groupReactions, groups } from '@/db/schema';
import type { AiCharacter, GroupDecisionResult, GroupMemberRow, PerceptionContext } from './types';
import { calculateScheduledTime, resolveSocialProfile } from './profile';
import { scheduleGroupMessageAttention } from './attention';

/**
 * Execute an AI group chat decision:
 * 1. Insert message / reaction / memory
 * 2. Advance AI member reading cursor (lastReadAt & lastReadMessageId)
 * 3. Schedule next check time for this character
 * 4. If message was sent, fan out attention to other group members
 */
export async function executeGroupDecision(
  userId: string,
  character: AiCharacter,
  member: GroupMemberRow,
  ctx: PerceptionContext,
  decision: GroupDecisionResult,
): Promise<{ success: boolean; actionTaken: string }> {
  const now = new Date();
  const profile = resolveSocialProfile(character);

  // 1. Determine latest message in group to advance read pointer
  const [latestMsg] = await db
    .select({ id: groupMessages.id, createdAt: groupMessages.createdAt })
    .from(groupMessages)
    .where(eq(groupMessages.groupId, ctx.group.id))
    .orderBy(desc(groupMessages.createdAt))
    .limit(1);

  const lastReadMessageId = latestMsg?.id || member.lastReadMessageId;
  const lastReadAt = latestMsg?.createdAt ? new Date(latestMsg.createdAt) : now;

  let actionTaken: string = decision.action;

  // 2. Perform Decision Action
  if (decision.action === 'react' && decision.targetMessageId && decision.reactionEmoji) {
    const rxId = crypto.randomUUID();
    try {
      await db.insert(groupReactions).values({
        id: rxId,
        groupId: ctx.group.id,
        messageId: decision.targetMessageId,
        userId,
        reactorType: 'ai',
        characterId: character.id,
        emoji: decision.reactionEmoji,
        createdAt: now,
      });
      actionTaken = `reacted:${decision.reactionEmoji}`;
    } catch {
      // Ignore unique index collision on duplicate reaction
      actionTaken = 'reacted_duplicate';
    }
  } else if (decision.action === 'reply' && decision.replyContent) {
    const msgId = crypto.randomUUID();
    await db.insert(groupMessages).values({
      id: msgId,
      groupId: ctx.group.id,
      userId,
      senderType: 'ai',
      senderCharacterId: character.id,
      content: decision.replyContent,
      replyToMessageId: decision.targetMessageId || null,
      mentions: '[]',
      createdAt: now,
    });

    // Update group preview
    await db
      .update(groups)
      .set({
        lastMessageAt: now,
        lastMessagePreview: `${character.name}: ${decision.replyContent.slice(0, 60)}`,
        updatedAt: now,
      })
      .where(and(eq(groups.id, ctx.group.id), eq(groups.userId, userId)));

    actionTaken = 'replied';

    // Fan out cascading attention to other AI members in the group
    await scheduleGroupMessageAttention(userId, ctx.group.id, msgId, character.id, decision.replyContent, decision.targetMessageId);
  } else if (decision.action === 'multi_message' && decision.multiMessages && decision.multiMessages.length > 0) {
    const msgCount = decision.multiMessages.length;
    let lastContent = '';
    let lastMsgId = '';

    for (let i = 0; i < msgCount; i++) {
      const content = decision.multiMessages[i];
      if (!content) continue;
      const msgId = crypto.randomUUID();
      // Add slight millisecond offset to guarantee strict ordering
      const msgTime = new Date(now.getTime() + i * 250);

      await db.insert(groupMessages).values({
        id: msgId,
        groupId: ctx.group.id,
        userId,
        senderType: 'ai',
        senderCharacterId: character.id,
        content,
        replyToMessageId: i === 0 ? decision.targetMessageId || null : null,
        mentions: '[]',
        createdAt: msgTime,
      });
      lastContent = content;
      lastMsgId = msgId;
    }

    // Update group preview
    await db
      .update(groups)
      .set({
        lastMessageAt: now,
        lastMessagePreview: `${character.name}: ${lastContent.slice(0, 60)}`,
        updatedAt: now,
      })
      .where(and(eq(groups.id, ctx.group.id), eq(groups.userId, userId)));

    actionTaken = `multi_replied:${msgCount}`;

    // Fan out cascading attention to other AI members
    await scheduleGroupMessageAttention(userId, ctx.group.id, lastMsgId, character.id, lastContent, decision.targetMessageId);
  }

  // 3. Durable Memory Distillation
  if (decision.shouldFormMemory && decision.memoryFact) {
    const memId = crypto.randomUUID();
    await db.insert(aiMemories).values({
      id: memId,
      userId,
      characterId: character.id,
      kind: 'event',
      content: `[群聊「${ctx.group.name}」] ${decision.memoryFact}`,
      strength: 0.7,
      confidence: 0.8,
      importance: decision.memoryImportance ?? 0.6,
      reinforcementCount: 1,
      sourceType: 'group',
      sourceId: ctx.group.id,
      lastReinforcedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 4. Update AI Member Reading Progress & Schedule Next Idle Check
  const nextCheckAt = calculateScheduledTime(profile, 0, { now, timezone: ctx.timezone });

  await db
    .update(groupMembers)
    .set({
      lastReadMessageId,
      lastReadAt,
      nextCheckAt,
      updatedAt: now,
    })
    .where(eq(groupMembers.id, member.id));

  return { success: true, actionTaken };
}
