import { and, asc, desc, eq, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, groupAttentionEvents, groupMembers, groups } from '@/db/schema';
import { buildPerceptionContext } from './perception';
import { makeGroupDecision } from './decision';
import { executeGroupDecision } from './action';

/**
 * Process a single group attention event:
 * Claims event -> Perception -> Decision -> Action -> Result update.
 */
export async function processGroupAttentionEvent(eventId: string): Promise<void> {
  const now = new Date();

  // 1. Claim event atomically
  const [event] = await db
    .select()
    .from(groupAttentionEvents)
    .where(and(eq(groupAttentionEvents.id, eventId), eq(groupAttentionEvents.status, 'pending')))
    .limit(1);

  if (!event) return;

  await db
    .update(groupAttentionEvents)
    .set({ status: 'processing' })
    .where(eq(groupAttentionEvents.id, eventId));

  try {
    // 2. Fetch Character & Group Member records
    const [character] = await db
      .select()
      .from(aiCharacters)
      .where(eq(aiCharacters.id, event.characterId))
      .limit(1);

    const [member] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, event.groupId), eq(groupMembers.characterId, event.characterId)))
      .limit(1);

    if (!character || !member || character.status !== 'active') {
      await db
        .update(groupAttentionEvents)
        .set({ status: 'skipped', actionTaken: 'inactive_or_removed', processedAt: now })
        .where(eq(groupAttentionEvents.id, eventId));
      return;
    }

    // 3. Perception: Read context strictly based on member reading progress
    const ctx = await buildPerceptionContext(event.userId, event.groupId, character, member);
    if (!ctx) {
      await db
        .update(groupAttentionEvents)
        .set({ status: 'skipped', actionTaken: 'group_not_found', processedAt: now })
        .where(eq(groupAttentionEvents.id, eventId));
      return;
    }

    // 4. Decision: Evaluate behavior based on persona, time, interest, anti-loop rules
    const decision = await makeGroupDecision(event.userId, character, ctx, {
      forceEngage: event.priority >= 3,
    });

    // 5. Action: Execute response & update member read state
    const result = await executeGroupDecision(event.userId, character, member, ctx, decision);

    // 6. Complete event record
    await db
      .update(groupAttentionEvents)
      .set({
        status: 'done',
        actionTaken: result.actionTaken,
        processedAt: new Date(),
      })
      .where(eq(groupAttentionEvents.id, eventId));
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[group-engine] failed to process event ${eventId}:`, err);
    await db
      .update(groupAttentionEvents)
      .set({
        status: 'failed',
        lastError: errorMsg,
        processedAt: new Date(),
      })
      .where(eq(groupAttentionEvents.id, eventId));
  }
}

/**
 * Process all due group attention events for a user.
 * Called opportunistically when opening group chat, on message sending, or via background cron/tick.
 */
export async function tickGroupAttention(
  userId: string,
  groupId?: string,
  limit = 6,
): Promise<{ processed: number; events: string[] }> {
  const now = new Date();

  // Find due events (scheduledFor <= now)
  const dueEvents = await db
    .select({ id: groupAttentionEvents.id })
    .from(groupAttentionEvents)
    .where(
      and(
        eq(groupAttentionEvents.userId, userId),
        eq(groupAttentionEvents.status, 'pending'),
        lte(groupAttentionEvents.scheduledFor, now),
        groupId ? eq(groupAttentionEvents.groupId, groupId) : undefined,
      ),
    )
    .orderBy(desc(groupAttentionEvents.priority), asc(groupAttentionEvents.scheduledFor))
    .limit(limit);

  const processedIds: string[] = [];

  for (const ev of dueEvents) {
    await processGroupAttentionEvent(ev.id);
    processedIds.push(ev.id);
  }

  return { processed: processedIds.length, events: processedIds };
}
