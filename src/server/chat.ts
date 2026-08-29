import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { aiCharacters, conversations, messages } from '@/db/schema';

export type ConversationView = {
  id: string;
  characterId: string;
  characterName: string;
  characterUsername: string;
  characterAvatarUrl: string | null;
  characterAvatarEmoji: string;
  characterAvatarColor: string;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  unreadCount: number;
};

export async function getConversations(userId: string): Promise<ConversationView[]> {
  const rows = await db
    .select({
      id: conversations.id,
      characterId: aiCharacters.id,
      characterName: aiCharacters.name,
      characterUsername: aiCharacters.username,
      characterAvatarUrl: aiCharacters.avatarUrl,
      characterAvatarEmoji: aiCharacters.avatarEmoji,
      characterAvatarColor: aiCharacters.avatarColor,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: sql<
        string | null
      >`(SELECT content FROM messages WHERE messages.conversation_id = conversations.id ORDER BY created_at DESC LIMIT 1)`,
      unreadCount: sql<number>`(SELECT CAST(count(*) AS INTEGER) FROM messages WHERE messages.conversation_id = conversations.id AND messages.role = 'assistant' AND (conversations.last_read_at IS NULL OR messages.created_at > conversations.last_read_at))`,
    })
    .from(conversations)
    .innerJoin(aiCharacters, eq(conversations.characterId, aiCharacters.id))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.lastMessageAt));
  return rows;
}

export async function getConversation(userId: string, conversationId: string) {
  const [row] = await db
    .select({
      id: conversations.id,
      summary: conversations.summary,
      summarizedCount: conversations.summarizedCount,
      character: aiCharacters,
    })
    .from(conversations)
    .innerJoin(aiCharacters, eq(conversations.characterId, aiCharacters.id))
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function getConversationByCharacter(userId: string, characterId: string) {
  const [conv] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.characterId, characterId)))
    .limit(1);
  return conv?.id ?? null;
}

export async function getOrCreateConversation(userId: string, characterId: string) {
  const [character] = await db
    .select()
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, characterId), eq(aiCharacters.userId, userId)))
    .limit(1);
  if (!character) return null;

  const existing = await getConversationByCharacter(userId, characterId);
  if (existing) return existing;

  const id = crypto.randomUUID();
  await db.insert(conversations).values({ id, userId, characterId });
  return id;
}

export async function getConversationMessages(conversationId: string, limit = 100) {
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export async function markConversationRead(userId: string, conversationId: string) {
  await db
    .update(conversations)
    .set({ lastReadAt: new Date() })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
}

export async function totalUnreadMessages(userId: string) {
  const [row] = await db
    .select({
      count: sql<number>`CAST(count(*) AS INTEGER)`,
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, userId),
        eq(messages.role, 'assistant'),
        gt(messages.createdAt, sql`COALESCE(conversations.last_read_at, unixepoch(0) * 1000)`),
      ),
    );
  return row?.count ?? 0;
}
