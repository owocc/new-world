import { after } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { conversations, messages, user } from '@/db/schema';
import { getSession } from '@/lib/session';
import { getConversation } from '@/server/chat';
import { appendMessageToTurn, tickTurns, QUIET_WINDOW_MS } from '@/server/ai/turn-engine';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = (await req.json()) as { conversationId?: string };
    const conversationId = body.conversationId;

    if (!conversationId) {
      return Response.json({ ok: false, error: 'conversationId is required' }, { status: 400 });
    }

    const conv = await getConversation(userId, conversationId);
    if (!conv) {
      return Response.json({ ok: false, error: 'Conversation not found' }, { status: 404 });
    }

    const [userInfo] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const userName = userInfo?.name || '我';
    const characterName = conv.character.name;

    const now = new Date();
    const systemMessageId = crypto.randomUUID();
    const pokeContent = `${userName} 拍了拍 ${characterName}`;

    // 1. Persist system poke message to DB
    await db.insert(messages).values({
      id: systemMessageId,
      conversationId,
      userId,
      role: 'system',
      content: pokeContent,
      createdAt: now,
    });

    // 2. Update conversation lastMessageAt & lastReadAt
    await db
      .update(conversations)
      .set({
        lastMessageAt: now,
        lastReadAt: now,
      })
      .where(eq(conversations.id, conversationId));

    // 3. Append to turn so AI is prompted to answer pending/interrupted messages
    const turnResult = await appendMessageToTurn({
      conversationId,
      userId,
      characterId: conv.character.id,
      messageId: systemMessageId,
    });

    // 4. Trigger turn tick asynchronously
    after(async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, QUIET_WINDOW_MS + 200));
        await tickTurns({ userId, conversationId, limit: 2 });
      } catch (err) {
        console.error('[api/chat/poke] background turn processing error:', err);
      }
    });

    return Response.json({
      ok: true,
      message: {
        id: systemMessageId,
        conversationId,
        role: 'system',
        content: pokeContent,
        createdAt: now,
      },
      turn: turnResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[api/chat/poke] error sending poke:', err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
