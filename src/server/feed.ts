import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, comments, posts, reactions, user } from '@/db/schema';
import { getFeedCover } from '@/server/settings';

export type FeedPost = {
  id: string;
  content: string;
  createdAt: Date;
  authorType: 'user' | 'ai';
  characterId: string | null;
  authorName: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  authorAvatarEmoji: string;
  authorAvatarColor: string;
  likeCount: number;
  commentCount: number;
  viewerLiked: boolean;
};

const authorSelect = {
  authorName: sql<string>`CASE WHEN posts.author_type = 'user' THEN (SELECT name FROM "user" WHERE "user".id = posts.user_id) ELSE (SELECT name FROM ai_characters WHERE ai_characters.id = posts.character_id) END`,
  authorUsername: sql<string>`CASE WHEN posts.author_type = 'user' THEN 'me' ELSE (SELECT username FROM ai_characters WHERE ai_characters.id = posts.character_id) END`,
  authorAvatarUrl: sql<string | null>`CASE WHEN posts.author_type = 'user' THEN (SELECT image FROM "user" WHERE "user".id = posts.user_id) ELSE (SELECT avatar_url FROM ai_characters WHERE ai_characters.id = posts.character_id) END`,
  authorAvatarEmoji: sql<string>`CASE WHEN posts.author_type = 'user' THEN '🧑' ELSE (SELECT avatar_emoji FROM ai_characters WHERE ai_characters.id = posts.character_id) END`,
  authorAvatarColor: sql<string>`CASE WHEN posts.author_type = 'user' THEN 'violet' ELSE (SELECT avatar_color FROM ai_characters WHERE ai_characters.id = posts.character_id) END`,
};

function basePostQuery(viewerUserId: string) {
  return db
    .select({
      id: posts.id,
      content: posts.content,
      createdAt: posts.createdAt,
      authorType: posts.authorType,
      characterId: posts.characterId,
      likeCount: sql<number>`(SELECT CAST(count(*) AS INTEGER) FROM reactions WHERE reactions.post_id = posts.id)`,
      commentCount: sql<number>`(SELECT CAST(count(*) AS INTEGER) FROM comments WHERE comments.post_id = posts.id)`,
      viewerLiked: sql<boolean>`EXISTS (SELECT 1 FROM reactions WHERE reactions.post_id = posts.id AND reactions.user_id = ${viewerUserId} AND reactions.author_type = 'user')`,
      ...authorSelect,
    })
    .from(posts);
}
export async function getFeedPosts(
  userId: string,
  limit = 30,
  offset = 0,
  filter?: 'all' | 'mine',
): Promise<FeedPost[]> {
  const conditions = [eq(posts.userId, userId)];
  if (filter === 'mine') {
    conditions.push(eq(posts.authorType, 'user'));
  }
  const rows = await basePostQuery(userId)
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);
  return rows as FeedPost[];
}

export async function getPostById(userId: string, postId: string): Promise<FeedPost | null> {
  const [row] = await basePostQuery(userId)
    .where(and(eq(posts.id, postId), eq(posts.userId, userId)))
    .limit(1);
  return (row as FeedPost) ?? null;
}

export type CommentView = {
  id: string;
  content: string;
  createdAt: Date;
  parentCommentId: string | null;
  authorType: 'user' | 'ai';
  characterId: string | null;
  authorName: string;
  authorAvatarEmoji: string;
  authorAvatarColor: string;
  authorAvatarUrl: string | null;
};

const commentAuthor = {
  authorName: sql<string>`CASE WHEN comments.author_type = 'user' THEN (SELECT name FROM "user" WHERE "user".id = comments.user_id) ELSE (SELECT name FROM ai_characters WHERE ai_characters.id = comments.character_id) END`,
  authorAvatarEmoji: sql<string>`CASE WHEN comments.author_type = 'user' THEN '🧑' ELSE (SELECT avatar_emoji FROM ai_characters WHERE ai_characters.id = comments.character_id) END`,
  authorAvatarColor: sql<string>`CASE WHEN comments.author_type = 'user' THEN 'violet' ELSE (SELECT avatar_color FROM ai_characters WHERE ai_characters.id = comments.character_id) END`,
  authorAvatarUrl: sql<string | null>`CASE WHEN comments.author_type = 'user' THEN (SELECT image FROM "user" WHERE "user".id = comments.user_id) ELSE (SELECT avatar_url FROM ai_characters WHERE ai_characters.id = comments.character_id) END`,
};

export async function getPostComments(
  userId: string,
  postId: string,
): Promise<{ topLevel: CommentView[]; replies: CommentView[] }> {
  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      parentCommentId: comments.parentCommentId,
      authorType: comments.authorType,
      characterId: comments.characterId,
      ...commentAuthor,
    })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.userId, userId)))
    .orderBy(comments.createdAt);

  return {
    topLevel: rows.filter((r) => !r.parentCommentId) as CommentView[],
    replies: rows.filter((r) => r.parentCommentId) as CommentView[],
  };
}

export async function getActiveCharacterCount(userId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
    .from(aiCharacters)
    .where(and(eq(aiCharacters.userId, userId), eq(aiCharacters.status, 'active')));
  return count;
}

export async function getUserProfile(userId: string) {
  const [u] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  return u ?? null;
}

export { getFeedCover };
