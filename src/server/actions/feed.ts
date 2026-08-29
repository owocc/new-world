'use server';

import { and, desc, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { aiCharacters, comments, communityEvents, notifications, posts, reactions } from '@/db/schema';
import { requireUserId } from '@/lib/session';
import { enqueueEvent } from '@/server/ai/community/events';
import { processEvent } from '@/server/ai/community/engine';

const createPostSchema = z.object({
  content: z.string().trim().min(1, '写点什么吧').max(2000, '最多 2000 字'),
});

export async function createPost(formData: FormData) {
  const userId = await requireUserId();
  const parsed = createPostSchema.safeParse({ content: formData.get('content') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '发布失败' };
  }

  const postId = crypto.randomUUID();
  await db.insert(posts).values({
    id: postId,
    userId,
    authorType: 'user',
    content: parsed.data.content,
  });

  // fan out to the AI community engine after the response is sent
  const eventId = await enqueueEvent(userId, 'user_post_created', {
    postId,
    dedupeKey: `post:${postId}`,
  });
  after(async () => {
    await processEvent(eventId).catch(console.error);
  });

  revalidatePath('/feed');
  return { ok: true };
}

export async function toggleLike(postId: string) {
  const userId = await requireUserId();

  const [existing] = await db
    .select({ id: reactions.id })
    .from(reactions)
    .where(
      and(
        eq(reactions.postId, postId),
        eq(reactions.userId, userId),
        eq(reactions.authorType, 'user'),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(reactions).where(eq(reactions.id, existing.id));
  } else {
    await db.insert(reactions).values({
      id: crypto.randomUUID(),
      postId,
      userId,
      authorType: 'user',
      type: 'like',
    });
  }
  revalidatePath('/feed');
  revalidatePath(`/post/${postId}`);
  return { liked: !existing };
}

const commentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().trim().min(1, '评论不能为空').max(500, '评论最多 500 字'),
  parentCommentId: z.string().nullable().optional(),
});

export async function addComment(input: z.input<typeof commentSchema>) {
  const userId = await requireUserId();
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '评论失败' };
  }

  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, parsed.data.postId), eq(posts.userId, userId)))
    .limit(1);
  if (!post) return { error: '动态不存在' };

  const commentId = crypto.randomUUID();
  await db.insert(comments).values({
    id: commentId,
    postId: parsed.data.postId,
    userId,
    authorType: 'user',
    content: parsed.data.content,
    parentCommentId: parsed.data.parentCommentId ?? null,
  });

  // let the AI community react to the comment
  const eventId = await enqueueEvent(userId, 'user_comment_created', {
    postId: parsed.data.postId,
    commentId,
    dedupeKey: `user-comment-event:${commentId}`,
  });
  after(async () => {
    await processEvent(eventId).catch(console.error);
  });

  revalidatePath('/feed');
  revalidatePath(`/post/${parsed.data.postId}`);
  return { ok: true };
}

export async function deletePost(postId: string) {
  const userId = await requireUserId();
  await db.delete(posts).where(and(eq(posts.id, postId), eq(posts.userId, userId)));
  revalidatePath('/feed');
  return { ok: true };
}

export async function markNotificationsRead() {
  const userId = await requireUserId();
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return { ok: true };
}

export async function unreadNotificationCount() {
  const userId = await requireUserId();
  const [{ count }] = await db
    .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return count;
}

export async function getUnreadEventCount() {
  const userId = await requireUserId();
  const [{ count }] = await db
    .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
    .from(communityEvents)
    .where(and(eq(communityEvents.userId, userId), eq(communityEvents.status, 'pending')));
  return count;
}


export type NotificationItem = {
  id: string;
  type: string;
  content: string;
  read: boolean;
  createdAt: Date;
  conversationId: string | null;
  postId: string | null;
  characterName: string | null;
  characterEmoji: string | null;
  characterColor: string | null;
  characterAvatarUrl: string | null;
};

export async function getRecentNotifications(limit = 10): Promise<NotificationItem[]> {
  const userId = await requireUserId();
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      content: notifications.content,
      read: notifications.read,
      createdAt: notifications.createdAt,
      conversationId: notifications.conversationId,
      postId: notifications.postId,
      characterName: aiCharacters.name,
      characterEmoji: aiCharacters.avatarEmoji,
      characterColor: aiCharacters.avatarColor,
      characterAvatarUrl: aiCharacters.avatarUrl,
    })
    .from(notifications)
    .leftJoin(aiCharacters, eq(notifications.characterId, aiCharacters.id))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows;
}

export async function markSingleNotificationRead(notificationId: string) {
  const userId = await requireUserId();
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  revalidatePath('/notifications');
  return { ok: true };
}