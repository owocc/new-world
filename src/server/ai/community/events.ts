import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { communityEvents } from '@/db/schema';

export type CommunityEventType =
  | 'user_post_created'
  | 'ai_post_created'
  | 'user_comment_created'
  | 'ai_comment_created'
  | 'community_pulse';

export type CommunityEventPayload = {
  postId?: string;
  commentId?: string;
  actorCharacterId?: string;
  /** AI->AI reply depth, hard-capped at 1 */
  depth?: number;
  dedupeKey?: string;
  [k: string]: unknown;
};

export async function enqueueEvent(
  userId: string,
  type: CommunityEventType,
  payload: CommunityEventPayload = {},
  opts: { scheduledFor?: Date } = {},
): Promise<string> {
  // dedupe: skip if an identical event was enqueued recently
  if (payload.dedupeKey) {
    const [dupe] = await db
      .select({ id: communityEvents.id })
      .from(communityEvents)
      .where(
        and(
          eq(communityEvents.userId, userId),
          sql`json_extract(${communityEvents.payload}, '$.dedupeKey') = ${payload.dedupeKey}`,
          sql`${communityEvents.createdAt} > unixepoch() * 1000 - 1000 * 60 * 60`,
        ),
      )
      .limit(1);
    if (dupe) return dupe.id;
  }

  const id = crypto.randomUUID();
  await db.insert(communityEvents).values({
    id,
    userId,
    type,
    payload: JSON.stringify(payload),
    scheduledFor: opts.scheduledFor ?? new Date(),
  });
  return id;
}
