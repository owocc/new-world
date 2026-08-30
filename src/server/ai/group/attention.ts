import { and, asc, desc, eq, gt, inArray, isNull, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, groupAttentionEvents, groupMembers, groupMessages, groups } from '@/db/schema';
import type { AiCharacter, GroupMemberRow } from './types';
import { calculateScheduledTime, resolveSocialProfile } from './profile';

/**
 * Schedule attention events for all AI members of a group when a message is created.
 */
export async function scheduleGroupMessageAttention(
  userId: string,
  groupId: string,
  messageId: string,
  senderCharacterId?: string | null,
  content: string = '',
  replyToMessageId?: string | null,
  mentions?: { type: string; id: string; name?: string; username?: string }[],
): Promise<void> {
  const now = new Date();

  // 1. Fetch all AI members in this group (except the sender)
  const aiMembers = await db
    .select({
      member: groupMembers,
      character: aiCharacters,
    })
    .from(groupMembers)
    .innerJoin(aiCharacters, eq(groupMembers.characterId, aiCharacters.id))
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId),
        eq(groupMembers.memberType, 'ai'),
        senderCharacterId ? ne(groupMembers.characterId, senderCharacterId) : undefined,
      ),
    );

  if (aiMembers.length === 0) return;

  // 2. If message has a replyToMessageId, identify who was replied to
  let repliedToCharacterId: string | null = null;
  if (replyToMessageId) {
    const [parent] = await db
      .select({ senderCharacterId: groupMessages.senderCharacterId })
      .from(groupMessages)
      .where(eq(groupMessages.id, replyToMessageId))
      .limit(1);
    if (parent?.senderCharacterId) {
      repliedToCharacterId = parent.senderCharacterId;
    }
  }

  // 3. For each AI member, compute priority and scheduled check time
  for (const { member, character } of aiMembers) {
    const profile = resolveSocialProfile(character);

    // Check mention via content string or explicit mentions array
    const isMentioned =
      (mentions && mentions.some((m) => m.type === 'ai' && (m.id === character.id || m.username === character.username))) ||
      content.includes(`@${character.name}`) ||
      content.includes(`@${character.username}`);

    const isDirectlyReplied = repliedToCharacterId === character.id;

    let priority = 1;
    let triggerType = 'new_message';
    let scheduledFor: Date;

    if (isMentioned) {
      priority = 3;
      triggerType = 'mention';
      // When @mentioned directly, schedule immediately (due now) so it triggers 100% on fast-path tick
      scheduledFor = now;
    } else if (isDirectlyReplied) {
      priority = 2;
      triggerType = 'reply';
      scheduledFor = calculateScheduledTime(profile, priority, { now });
    } else {
      scheduledFor = calculateScheduledTime(profile, priority, { now });
    }

    const dedupeKey = `${groupId}:${character.id}`;
    const [existing] = await db
      .select()
      .from(groupAttentionEvents)
      .where(
        and(
          eq(groupAttentionEvents.groupId, groupId),
          eq(groupAttentionEvents.characterId, character.id),
          eq(groupAttentionEvents.status, 'pending'),
        ),
      )
      .limit(1);

    if (existing) {
      // If new event has higher priority, or sooner scheduled time, upgrade it!
      if (priority > existing.priority || scheduledFor < existing.scheduledFor) {
        await db
          .update(groupAttentionEvents)
          .set({
            priority,
            triggerType,
            triggerMessageId: messageId,
            scheduledFor,
            dedupeKey,
            createdAt: now,
          })
          .where(eq(groupAttentionEvents.id, existing.id));
      }
    } else {
      const eventId = crypto.randomUUID();
      await db.insert(groupAttentionEvents).values({
        id: eventId,
        userId,
        groupId,
        characterId: character.id,
        triggerType,
        priority,
        triggerMessageId: messageId,
        scheduledFor,
        status: 'pending',
        dedupeKey,
        createdAt: now,
      });
    }

    // Also update member's nextCheckAt
    await db
      .update(groupMembers)
      .set({
        nextCheckAt: scheduledFor,
        updatedAt: now,
      })
      .where(eq(groupMembers.id, member.id));
  }
}
