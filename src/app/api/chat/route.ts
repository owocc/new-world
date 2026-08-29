import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { conversations, messages } from '@/db/schema';
import { getSession } from '@/lib/session';
import { NoProviderError, resolveModel, runStream } from '@/server/ai/core';
import { characterSystemPrompt, chatMemoryBlock } from '@/server/ai/prompts';
import { buildChatContext, maybeSummarizeConversation, extractMemories } from '@/server/ai/memory';
import { getConversation, markConversationRead } from '@/server/chat';
import { linkMediaToMessage, getMediaForMessages } from '@/server/media';
import { waitForMediaPerceptions } from '@/server/ai/vision';
import type { ModelMessage, UIMessage } from 'ai';

export const maxDuration = 60;

type ChatRequestBody = {
  conversationId?: string;
  messages?: UIMessage[];
  mediaAssetIds?: string[];
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
    const mediaAssetIds = Array.isArray(body.mediaAssetIds) ? body.mediaAssetIds : [];

    if (!body.conversationId || (!text.trim() && mediaAssetIds.length === 0)) {
      return new Response('Bad Request', { status: 400 });
    }

    // verify conversation ownership
    const conv = await getConversation(userId, body.conversationId);
    if (!conv) {
      return new Response('Not Found', { status: 404 });
    }
    const convId = body.conversationId;

    // Resolve model to know vision capability
    const resolved = await resolveModel(userId, conv.character.id);

    // Persist the user's message
    const userMsgId = crypto.randomUUID();
    await db.insert(messages).values({
      id: userMsgId,
      conversationId: convId,
      userId,
      role: 'user',
      content: text.trim(),
    });

    // Link uploaded media assets and wait briefly for vision interpreter perception
    if (mediaAssetIds.length > 0) {
      await linkMediaToMessage(userId, userMsgId, mediaAssetIds);
      await waitForMediaPerceptions(userId, mediaAssetIds, 3500);
    }

    await markConversationRead(userId, convId);
    // Assemble memory-aware context
    const { recent, memories } = await buildChatContext({
      userId,
      conversationId: convId,
      characterId: conv.character.id,
    });

    const memoryBlock = chatMemoryBlock(memories, conv.summary);
    const system =
      characterSystemPrompt(conv.character, session.user.name) + (memoryBlock ? `\n\n${memoryBlock}` : '');

    // Convert recent messages to ModelMessage format with vision perception reuse
    const contextMessages: ModelMessage[] = recent.map((m) => {
      if (m.role === 'assistant') {
        return {
          role: 'assistant',
          content: m.content,
        };
      }

      // For user messages: check attachments
      const hasAttachments = m.attachments && m.attachments.length > 0;

      if (!hasAttachments) {
        return {
          role: 'user',
          content: m.content || ' ',
        };
      }

      const summaries = m.attachments
        .map((a) => a.perception?.summary)
        .filter((s): s is string => Boolean(s && s.trim()));

      let imageNote = '';
      if (summaries.length > 0) {
        imageNote = summaries
          .map((s, idx) => (summaries.length > 1 ? `[图片${idx + 1}内容: ${s}]` : `[图片内容: ${s}]`))
          .join('\n');
      } else {
        const isProcessing = m.attachments.some(
          (a) => a.perception?.status === 'processing' || a.perception?.status === 'pending',
        );
        imageNote = isProcessing
          ? `[发送了 ${m.attachments.length} 张图片 (正在识别中...)]`
          : `[发送了 ${m.attachments.length} 张图片]`;
      }

      const userText = m.content.trim();
      const fullText = userText && imageNote ? `${userText}\n${imageNote}` : userText || imageNote;

      return {
        role: 'user',
        content: fullText || ' ',
      };
    });

    const result = await runStream({
      userId,
      characterId: conv.character.id,
      callType: 'chat',
      system,
      prompt: text.trim() || '（用户发送了图片）',
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

        // Memory maintenance (best-effort)
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
