import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { getSession } from '@/lib/session';
import { NoProviderError, runStream } from '@/server/ai/core';
import { characterSystemPrompt, chatMemoryBlock } from '@/server/ai/prompts';
import { buildChatContext, maybeSummarizeConversation, extractMemories } from '@/server/ai/memory';
import { getConversation, markConversationRead } from '@/server/chat';
import type { ModelMessage, UIMessage } from 'ai';

export const maxDuration = 60;

type ChatRequestBody = {
  conversationId?: string;
  messages?: UIMessage[];
};

function extractText(message: UIMessage): string {
  return message.parts
    ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = (await req.json()) as ChatRequestBody;
    const uiMessages = body.messages ?? [];
    const lastUser = [...uiMessages].reverse().find((m) => m.role === 'user');
    const text = lastUser ? extractText(lastUser) : '';
    if (!body.conversationId || !text.trim()) {
      return new Response('Bad Request', { status: 400 });
    }

    // conversationId here is the conversation id; verify ownership
    const conv = await getConversation(userId, body.conversationId);
    if (!conv) {
      return new Response('Not Found', { status: 404 });
    }
    const convId = body.conversationId;

    // persist the user's message
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      conversationId: convId,
      userId,
      role: 'user',
      content: text.trim(),
    });
    await markConversationRead(userId, convId);

    // assemble memory-aware context
    const { recent, memories } = await buildChatContext({
      userId,
      conversationId: convId,
      characterId: conv.character.id,
    });

    const memoryBlock = chatMemoryBlock(memories, conv.summary);
    const system =
      characterSystemPrompt(conv.character, session.user.name) + (memoryBlock ? `\n\n${memoryBlock}` : '');

    const contextMessages: ModelMessage[] = recent.map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const result = await runStream({
      userId,
      characterId: conv.character.id,
      callType: 'chat',
      system,
      prompt: text,
      messages: contextMessages,
      maxOutputTokens: 800,
      onFinish: async (fullText) => {
        if (!fullText.trim()) return;
        await db.insert(messages).values({
          id: crypto.randomUUID(),
          conversationId: convId,
          userId,
          role: 'assistant',
          content: fullText,
        });
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, convId));

        // memory maintenance (best-effort)
        await maybeSummarizeConversation({ userId, conversationId: convId }).catch(console.error);
        const [{ count }] = await db
          .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
          .from(messages)
          .where(eq(messages.conversationId, convId));
        if (count % 10 === 0) {
          await extractMemories({
            userId,
            conversationId: convId,
            characterId: conv.character.id,
          }).catch(console.error);
        }
      },
    });

    return result.toUIMessageStreamResponse({
      onError: (err) =>
        err instanceof NoProviderError ? err.message : 'AI 服务暂时不可用，请稍后重试',
    });
  } catch (err) {
    if (err instanceof NoProviderError) {
      return new Response(err.message, { status: 409 });
    }
    console.error('[chat] error', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
