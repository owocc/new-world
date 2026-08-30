import { and, asc, desc, eq, inArray, lt, lte, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import {
  aiCharacters,
  conversations,
  conversationTurns,
  messages,
  notifications,
  user,
} from '@/db/schema';
import { runText, runObject, resolveModel, NoProviderError } from './core';
import { characterSystemPrompt, chatMemoryBlock } from './prompts';
import {
  buildChatContext,
  getForgetfulnessProfile,
  maybeSummarizeConversation,
  extractMemories,
} from './memory';
import { createHistoryRecallTool } from './recall';
import { createImageGenTool } from './image-tool';
import { generateCharacterImage, type GeneratedImage } from './image';
import { formatAttachmentPromptBlock, waitForMediaPerceptions } from './vision';
import { getMediaForMessages, type MediaAssetView } from '@/server/media';
import { messageAttachments } from '@/db/schema';
import {
  claimRedPacket,
  createRedPacket,
  getOrCreateWalletAccount,
  getUnclaimedRedPacketsForCharacter,
  walletTransfer,
  WalletError,
} from '@/server/wallet';
import { formatWalletMoney } from '@/lib/wallet-currency';
import type { ModelMessage } from 'ai';

/**
 * Turn configuration constants
 */
export const QUIET_WINDOW_MS = 2500; // 2.5s of no new messages triggers scheduled status
export const MAX_COLLECT_WINDOW_MS = 15000; // 15s max collect duration before forcing scheduled
export const LEASE_DURATION_MS = 60000; // 60s lease for worker execution
export const MAX_MESSAGES_PER_TURN = 4; // Max AI message bubbles per turn to avoid spamming
export const MAX_RETRY_COUNT = 3; // Max retries before failing a turn

export type TurnStatus = 'collecting' | 'scheduled' | 'processing' | 'completed' | 'failed';

/**
 * Enqueue or append a user message into a ConversationTurn.
 * If there's an active 'collecting' turn, append to it and push the quiet window deadline.
 * If no 'collecting' turn exists (e.g. previous turn is processing or completed), create a new collecting turn.
 */
export async function appendMessageToTurn(args: {
  conversationId: string;
  userId: string;
  characterId: string;
  messageId: string;
}): Promise<{ turnId: string; status: TurnStatus }> {
  const now = new Date();
  const nowMs = now.getTime();

  // Check for an existing collecting turn in this conversation
  const [existingTurn] = await db
    .select()
    .from(conversationTurns)
    .where(
      and(
        eq(conversationTurns.conversationId, args.conversationId),
        eq(conversationTurns.status, 'collecting'),
      ),
    )
    .limit(1);

  if (existingTurn) {
    const collectDeadlineMs = new Date(existingTurn.collectDeadline).getTime();
    // If quiet window is within maximum collection window, extend scheduledFor
    const newScheduledMs = Math.min(nowMs + QUIET_WINDOW_MS, collectDeadlineMs);

    await db
      .update(conversationTurns)
      .set({
        scheduledFor: new Date(newScheduledMs),
        updatedAt: now,
      })
      .where(eq(conversationTurns.id, existingTurn.id));

    // Link message to turn
    await db
      .update(messages)
      .set({ turnId: existingTurn.id })
      .where(eq(messages.id, args.messageId));

    return { turnId: existingTurn.id, status: 'collecting' };
  }

  // Create a brand new collecting turn
  const newTurnId = crypto.randomUUID();
  const scheduledFor = new Date(nowMs + QUIET_WINDOW_MS);
  const collectDeadline = new Date(nowMs + MAX_COLLECT_WINDOW_MS);

  await db.insert(conversationTurns).values({
    id: newTurnId,
    conversationId: args.conversationId,
    userId: args.userId,
    characterId: args.characterId,
    status: 'collecting',
    scheduledFor,
    collectDeadline,
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Link message to turn
  await db
    .update(messages)
    .set({ turnId: newTurnId })
    .where(eq(messages.id, args.messageId));

  return { turnId: newTurnId, status: 'collecting' };
}

/**
 * Claim and acquire a processing lease on a turn.
 * Uses atomic UPDATE with fencing generationId and expiration check.
 * Returns the acquired turn if successful, or null if another worker claimed it or state changed.
 */
export async function claimTurnLease(
  turnId: string,
  options?: { workerId?: string; force?: boolean },
): Promise<{
  acquired: boolean;
  generationId?: string;
  turn?: typeof conversationTurns.$inferSelect;
}> {
  const workerId = options?.workerId || `worker-${crypto.randomUUID().slice(0, 8)}`;
  const force = options?.force ?? false;
  const now = new Date();
  const nowMs = now.getTime();
  const leaseExpiresAt = new Date(nowMs + LEASE_DURATION_MS);
  const generationId = crypto.randomUUID();

  // Atomically claim turn if:
  // 1. status is 'scheduled' OR 'collecting' (and scheduledFor <= now)
  // 2. OR status is 'processing' but lease has expired (stale recovery)
  const result = await db
    .update(conversationTurns)
    .set({
      status: 'processing',
      generationId,
      leaseExpiresAt,
      lockedBy: workerId,
      updatedAt: now,
    })
    .where(
      and(
        eq(conversationTurns.id, turnId),
        force
          ? sql`1=1`
          : or(
              eq(conversationTurns.status, 'scheduled'),
              and(
                eq(conversationTurns.status, 'collecting'),
                lte(conversationTurns.scheduledFor, now),
              ),
              and(
                eq(conversationTurns.status, 'processing'),
                lt(conversationTurns.leaseExpiresAt, now),
              ),
            ),
      ),
    )
    .returning();
  const claimed = result[0];
  if (!claimed) {
    return { acquired: false };
  }

  return {
    acquired: true,
    generationId,
    turn: claimed,
  };
}

/**
 * Process a single conversation turn:
 * 1. Acquire lease (fencing token generationId)
 * 2. Gather fresh context AT GENERATION TIME:
 *    - Persona, Relationship, Current Time
 *    - Unsummarized recent messages + Current Turn user messages
 *    - Relevant memory + forgetfulness profile + history recall tool
 * 3. Call model to generate 1 to N natural message responses
 * 4. Verify lease validity before committing messages (fencing protection against slow zombie workers)
 * 5. Commit assistant messages, mark turn completed, update conversation timestamp, create notification
 */
export async function processTurn(
  turnId: string,
  options?: { workerId?: string; callerUserId?: string; force?: boolean },
): Promise<{ success: boolean; messageCount?: number; error?: string }> {
  // Step 1: Claim lease
  const claim = await claimTurnLease(turnId, { workerId: options?.workerId, force: options?.force });
  if (!claim.acquired || !claim.turn || !claim.generationId) {
    return { success: false, error: 'Failed to acquire turn lease or turn already claimed' };
  }

  const { turn, generationId } = claim;
  const conversationId = turn.conversationId;
  const userId = turn.userId;
  const characterId = turn.characterId;

  try {
    // Fetch character, conversation and user info
    const [character] = await db
      .select()
      .from(aiCharacters)
      .where(eq(aiCharacters.id, characterId))
      .limit(1);

    if (!character) {
      throw new Error(`Character ${characterId} not found`);
    }

    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (!conv) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const [userInfo] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    const userName = userInfo?.name || '朋友';

    // Step 2: Build real-time context dynamically
    // Wait for any media perception in recent user messages
    const turnUserMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.turnId, turnId),
          eq(messages.role, 'user'),
        ),
      )
      .orderBy(asc(messages.createdAt));

    const turnMsgIds = turnUserMessages.map((m) => m.id);
    const mediaMap = await getMediaForMessages(turnMsgIds);
    const allAttachments: MediaAssetView[] = [];
    for (const atts of mediaMap.values()) {
      allAttachments.push(...atts);
    }

    if (allAttachments.length > 0) {
      await waitForMediaPerceptions(
        userId,
        allAttachments.map((a) => a.id),
        25000,
      );
    }

    // Assemble memory-aware context
    const { recent, memories } = await buildChatContext({
      userId,
      characterId,
      conversationId,
    });

    const moneyContextParts: string[] = [];
    let walletBalance = 0;
    try {
      const account = await getOrCreateWalletAccount({ userId, ownerType: 'ai', characterId });
      walletBalance = account.balance;

      const unclaimed = await getUnclaimedRedPacketsForCharacter({
        userId,
        conversationId,
        characterId,
      });
      for (const packet of unclaimed) {
        try {
          const result = await claimRedPacket({
            userId,
            redPacketId: packet.id,
            claimant: { ownerType: 'ai', characterId },
          });
          moneyContextParts.push(
            `你刚拆开了 ${userName} 发的红包，领到 ${formatWalletMoney(result.amount, result.currency)}，记得自然地道声谢或反应一下。`,
          );
        } catch (claimErr) {
          console.warn('[turn-engine] auto claim red packet skipped', claimErr);
        }
      }
      if (walletBalance > 0) {
        moneyContextParts.push(
          `你的钱包余额：${formatWalletMoney(walletBalance)}（New World 平台余额）。`,
        );
      }
    } catch (walletErr) {
      console.warn('[turn-engine] wallet context skipped', walletErr);
    }
    const walletBlock = moneyContextParts.length ? `\n\n【钱包】\n${moneyContextParts.join('\n')}` : '';

    const memoryBlock = chatMemoryBlock(memories, conv.summary);
    const profile = getForgetfulnessProfile(character.memoryRetention);
    const nowStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    const system =
      characterSystemPrompt(character, userName, {
        currentTime: nowStr,
        retentionLabel: profile.label,
      }) +
      (memoryBlock ? `\n\n${memoryBlock}` : '') +
      walletBlock +
      `\n\n【异步即时消息回复规则】
你现在正在微信/即时聊天软件中与 ${userName} 私聊。
对方可能连续给你发送了 1 条或多条消息。请根据你的性格、关系、当前情绪自然组织回复。
要求：
1. 像真人发即时消息一样聊天，可以是一句话，也可以根据语境分成 1~${MAX_MESSAGES_PER_TURN} 条简短连续的气泡消息（例如先吐槽/表达情绪，再回答具体事情，或自然分句）。
2. 不要长篇大论说教，不要把所有回答生硬塞成一个巨型小论文。
3. 请以 JSON 数组格式返回你的消息列表，每条代表一个发送气泡：
\`\`\`json
{
  "messages": [
    "啊？？？",
    "又是昨天那个人？",
    "他是不是有病"
  ]
}
\`\`\`
最多不超过 ${MAX_MESSAGES_PER_TURN} 条。如果没有特殊需要拆分，返回 1~2 条最自然。内容不要带多余的 markdown json 外壳，直接按 schema 生成。`;

    const recallTool = createHistoryRecallTool({
      userId,
      characterId,
      currentConversationId: conversationId,
    });

    // 钱包：AI 自动拆开用户发来且未领取的红包（48h 内），并把结果注入上下文，
    // 让回复自然地提到收红包这件事
    // Map recent history into ModelMessage format
    const contextMessages: ModelMessage[] = recent.map((m) => {
      const isAssistant = m.role === 'assistant';
      const isSystem = m.role === 'system';
      const promptBlocks: string[] = [];

      if (!isAssistant && !isSystem && m.attachments && m.attachments.length > 0) {
        const attachmentBlock = formatAttachmentPromptBlock(m.attachments);
        if (attachmentBlock) promptBlocks.push(attachmentBlock);
      }

      if (m.content) {
        if (isSystem) {
          promptBlocks.push(`[系统提示：${m.content}。如果之前有没说完的话或对方正在等你的消息，请自然接着回复]`);
        } else {
          promptBlocks.push(m.content);
        }
      }

      return {
        role: isAssistant ? 'assistant' : 'user',
        content: promptBlocks.join('\n\n'),
      };
    });

    // Step 3: Run model generation
    const responseSchema = z.object({
      messages: z
        .array(z.string().trim().min(1))
        .min(1)
        .max(MAX_MESSAGES_PER_TURN)
        .describe('List of separate message bubbles to send in order'),
    });

    let generatedBubbleTexts: string[] = [];
    let usageId: string | undefined;

    try {
      const generated = await runObject({
        userId,
        characterId,
        callType: 'chat',
        system,
        messages: contextMessages,
        schema: responseSchema,
        schemaName: 'TurnResponse',
        schemaDescription: 'Natural chat response broken into separate message bubbles',
        tools: {
          searchHistory: recallTool,
        },
      });

      generatedBubbleTexts = (generated?.messages || []).filter((t) => t && t.trim().length > 0);
    } catch (objErr) {
      // Fallback: If structured generation fails, generate text and split on double newlines
      console.warn('[turn-engine] structured generation fallback to text generation', objErr);
      const rawText = await runText({
        userId,
        characterId,
        callType: 'chat',
        system,
        messages: contextMessages,
        tools: {
          searchHistory: recallTool,
        },
      });

      if (rawText && rawText.trim()) {
        const parts = rawText
          .split(/\n\n+/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        generatedBubbleTexts = parts.slice(0, MAX_MESSAGES_PER_TURN);
      }
    }

    if (generatedBubbleTexts.length === 0) {
      generatedBubbleTexts = ['嗯。'];
    }

    // AI 生图：仅在生图配置启用时进行一次决策，模型依据人设和上下文自行判断是否配图；
    // 未配置时 resolveImageModel 返回 enabled=false，这里完全不产生任何调用。
    let chatImage: GeneratedImage | null = null;
    const imageToolSet = await createImageGenTool({ userId, characterId, collected: [] });
    if (Object.keys(imageToolSet).length > 0) {
      try {
        const decision = await runObject({
          userId,
          characterId,
          callType: 'chat',
          system,
          messages: [
            ...contextMessages,
            {
              role: 'user' as const,
              content: `【内部决策，不要回复用户】基于以上对话和你的人设，判断你现在是否适合随消息发一张图片（例如对方想看某个东西、你在分享生活、用画面表达更自然）。没有明确需要就选择 false。`,
            },
          ],
          schema: z.object({
            act: z.boolean().describe('是否需要生成一张图片随消息发出'),
            prompt: z.string().describe('act 为 true 时的图片画面描述；为 false 时留空'),
          }),
          temperature: 0.7,
          maxOutputTokens: 300,
        });
        if (decision.act && decision.prompt.trim()) {
          chatImage = await generateCharacterImage({
            userId,
            characterId,
            prompt: decision.prompt.trim(),
          });
        }
      } catch (imgErr) {
        // 生图失败不影响文字消息
        console.error('[turn-engine] image generation skipped', imgErr);
      }
    }

    // Step 4: Fencing check & Commit messages atomically
    const commitTime = new Date();

    // Verify lease is still ours before writing
    const [currentTurn] = await db
      .select()
      .from(conversationTurns)
      .where(eq(conversationTurns.id, turnId))
      .limit(1);

    if (!currentTurn || currentTurn.generationId !== generationId) {
      console.warn(
        `[turn-engine] Generation ${generationId} for turn ${turnId} discarded due to lease fencing mismatch.`,
      );
      return { success: false, error: 'Fencing check failed - lease was lost or expired' };
    }

    // Write all AI message bubbles
    const createdMsgIds: string[] = [];
    for (let i = 0; i < generatedBubbleTexts.length; i++) {
      const text = generatedBubbleTexts[i];
      const msgId = crypto.randomUUID();
      // Space out timestamps slightly to ensure deterministic ordering
      const msgCreatedAt = new Date(commitTime.getTime() + i * 150);

      await db.insert(messages).values({
        id: msgId,
        conversationId,
        userId,
        role: 'assistant',
        content: text,
        turnId,
        usageId,
        createdAt: msgCreatedAt,
      });
      createdMsgIds.push(msgId);
    }

    // 生图结果挂到最后一条 AI 消息上（复用聊天气泡的附件渲染）
    if (chatImage?.id && createdMsgIds.length > 0) {
      await db.insert(messageAttachments).values({
        id: crypto.randomUUID(),
        messageId: createdMsgIds[createdMsgIds.length - 1],
        mediaAssetId: chatImage.id,
        order: 0,
      });
    }

    // 钱包：AI 决定是否随消息发转账/红包（仅在语境明确相关时才做这次决策）。
    // 金额与余额服务端强校验，失败只影响本条金钱消息，不影响文字。
    const recentUserText = turnUserMessages.map((m) => m.content).join('\n');
    const moneyIntent =
      /(红包|转账|打钱|发钱|收下|零花钱|请你吃饭|请你喝|块钱|元[吧呗呀！！?？]|¥)/.test(recentUserText) ||
      moneyContextParts.length > 0;
    if (moneyIntent) {
      try {
        const decision = await runObject({
          userId,
          characterId,
          callType: 'chat',
          system,
          messages: [
            ...contextMessages,
            {
              role: 'user' as const,
              content: `【内部决策，不要回复用户】基于以上对话和你的人设，判断你现在是否应该给 ${userName} 发一笔转账或一个红包（比如对方提到钱、你答应给零花钱、你想请客、你想回应收红包等）。没有明确动机就选 false。金额要在你的余额（${formatWalletMoney(walletBalance)}）范围内，且单笔不超过 N$200。`,
            },
          ],
          schema: z.object({
            act: z.boolean().describe('是否真的要发转账或红包'),
            kind: z.enum(['transfer', 'red_packet']).describe('transfer=转账；red_packet=红包'),
            amountYuan: z.number().min(0.01).max(200).describe('金额（元）'),
            shareCount: z.number().int().min(1).max(5).optional().describe('红包份数（仅红包）'),
            note: z.string().max(50).describe('转账备注或红包祝福语'),
          }),
          temperature: 0.8,
          maxOutputTokens: 200,
        });

        if (decision.act && decision.note) {
          const amountCents = Math.max(1, Math.round(decision.amountYuan * 100));
          const moneyMsgId = crypto.randomUUID();
          const moneyCreatedAt = new Date(commitTime.getTime() + generatedBubbleTexts.length * 150 + 150);
          try {
            if (decision.kind === 'transfer') {
              await walletTransfer({
                userId,
                from: { ownerType: 'ai', characterId },
                to: { ownerType: 'user' },
                amount: amountCents,
                note: decision.note,
                messageId: moneyMsgId,
              });
            } else {
              const { id: redPacketId } = await createRedPacket({
                userId,
                sender: { ownerType: 'ai', characterId },
                totalAmount: amountCents,
                shareCount: decision.shareCount ?? 1,
                greeting: decision.note,
                messageId: moneyMsgId,
              });
              await db.insert(messages).values({
                id: moneyMsgId,
                conversationId,
                userId,
                role: 'assistant',
                type: 'red_packet',
                payload: JSON.stringify({
                  redPacketId,
                  totalAmount: amountCents,
                  currency: 'nw',
                  shareCount: decision.shareCount ?? 1,
                  greeting: decision.note,
                }),
                content: decision.note,
                turnId,
                createdAt: moneyCreatedAt,
              });
            }
            if (decision.kind === 'transfer') {
              await db.insert(messages).values({
                id: moneyMsgId,
                conversationId,
                userId,
                role: 'assistant',
                type: 'transfer',
                payload: JSON.stringify({ amount: amountCents, currency: 'nw', note: decision.note }),
                content: '',
                turnId,
                createdAt: moneyCreatedAt,
              });
            }
            // 金钱消息时间戳晚于文字气泡，保持会话「最后消息时间」正确
            await db
              .update(conversations)
              .set({ lastMessageAt: moneyCreatedAt })
              .where(eq(conversations.id, conversationId));
          } catch (sendErr) {
            if (sendErr instanceof WalletError) {
              console.warn('[turn-engine] ai money send skipped:', sendErr.message);
            } else {
              throw sendErr;
            }
          }
        }
      } catch (moneyErr) {
        console.warn('[turn-engine] money decision skipped', moneyErr);
      }
    }

    // Update conversation lastMessageAt
    const lastMsgDate = new Date(commitTime.getTime() + (generatedBubbleTexts.length - 1) * 150);
    await db
      .update(conversations)
      .set({
        lastMessageAt: lastMsgDate,
      })
      .where(eq(conversations.id, conversationId));

    // Mark Turn completed
    await db
      .update(conversationTurns)
      .set({
        status: 'completed',
        completedAt: lastMsgDate,
        updatedAt: lastMsgDate,
        error: null,
      })
      .where(and(eq(conversationTurns.id, turnId), eq(conversationTurns.generationId, generationId)));

    // Create notification only if the conversation is not already read up to this message
    // (user actively viewing the chat keeps lastReadAt fresh, so no notification needed)
    const previewContent = generatedBubbleTexts.join(' ');
    const [convReadState] = await db
      .select({ lastReadAt: conversations.lastReadAt })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);
    const alreadySeen =
      convReadState?.lastReadAt != null &&
      new Date(convReadState.lastReadAt).getTime() >= lastMsgDate.getTime();
    if (!alreadySeen) {
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId,
        type: 'dm',
        characterId,
        conversationId,
        content: previewContent.slice(0, 100),
        read: false,
        createdAt: lastMsgDate,
      });
    }

    // Step 5: Post-turn memory extraction & summary (asynchronously)
    try {
      const [{ count }] = await db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(messages)
        .where(eq(messages.conversationId, conversationId));

      if (count % 8 === 0) {
        await extractMemories({
          userId,
          characterId,
          conversationId,
        }).catch(console.error);
      }
      await maybeSummarizeConversation({ conversationId, userId }).catch(console.error);
    } catch (postErr) {
      console.warn('[turn-engine] post-turn memory/summary update failed', postErr);
    }

    return {
      success: true,
      messageCount: generatedBubbleTexts.length,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[turn-engine] Error processing turn ${turnId}:`, err);

    // Update turn state with error and increment retry count
    const [currentTurn] = await db
      .select({ retryCount: conversationTurns.retryCount })
      .from(conversationTurns)
      .where(eq(conversationTurns.id, turnId))
      .limit(1);

    const retryCount = (currentTurn?.retryCount ?? 0) + 1;
    const shouldFailPermanently = retryCount >= MAX_RETRY_COUNT;

    await db
      .update(conversationTurns)
      .set({
        status: shouldFailPermanently ? 'failed' : 'scheduled',
        retryCount,
        error: errorMsg,
        leaseExpiresAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(conversationTurns.id, turnId));

    return { success: false, error: errorMsg };
  }
}

/**
 * Check and promote collecting turns whose quiet window or max collection window has elapsed.
 */
export async function promoteDueCollectingTurns(limit = 20): Promise<number> {
  const now = new Date();

  // Find collecting turns that are past scheduledFor or collectDeadline
  const dueCollecting = await db
    .select({ id: conversationTurns.id })
    .from(conversationTurns)
    .where(
      and(
        eq(conversationTurns.status, 'collecting'),
        or(
          lte(conversationTurns.scheduledFor, now),
          lte(conversationTurns.collectDeadline, now),
        ),
      ),
    )
    .limit(limit);

  if (dueCollecting.length === 0) return 0;

  const ids = dueCollecting.map((t) => t.id);
  await db
    .update(conversationTurns)
    .set({
      status: 'scheduled',
      updatedAt: now,
    })
    .where(inArray(conversationTurns.id, ids));

  return ids.length;
}

/**
 * Process all due turns for a given user or conversation, or globally across active turns.
 */
export async function tickTurns(options?: {
  userId?: string;
  conversationId?: string;
  limit?: number;
}): Promise<{ processed: number; turns: string[] }> {
  const now = new Date();
  const limit = options?.limit ?? 6;

  // 1. Promote any due collecting turns
  await promoteDueCollectingTurns(limit);

  // 2. Find scheduled turns or expired processing turns
  const conditions = [
    or(
      eq(conversationTurns.status, 'scheduled'),
      and(
        eq(conversationTurns.status, 'processing'),
        lt(conversationTurns.leaseExpiresAt, now),
      ),
    ),
  ];

  if (options?.userId) {
    conditions.push(eq(conversationTurns.userId, options.userId));
  }
  if (options?.conversationId) {
    conditions.push(eq(conversationTurns.conversationId, options.conversationId));
  }

  const candidateTurns = await db
    .select({ id: conversationTurns.id, conversationId: conversationTurns.conversationId })
    .from(conversationTurns)
    .where(and(...conditions))
    .orderBy(asc(conversationTurns.scheduledFor))
    .limit(limit);

  const processedIds: string[] = [];

  for (const t of candidateTurns) {
    const res = await processTurn(t.id, { callerUserId: options?.userId });
    if (res.success) {
      processedIds.push(t.id);
    }
  }

  return {
    processed: processedIds.length,
    turns: processedIds,
  };
}

/**
 * Derives current dynamic typing and pending status for a conversation.
 * If a turn is actively collecting, scheduled, or processing under a valid unexpired lease,
 * typing is TRUE. If the lease expired or the turn completed/failed, typing is automatically FALSE.
 */
export async function getConversationTurnState(conversationId: string): Promise<{
  isTyping: boolean;
  status: TurnStatus | 'idle';
  turnId?: string;
  scheduledFor?: Date;
  leaseExpiresAt?: Date;
}> {
  const now = new Date();

  // Look for any active turn in collecting, scheduled, or processing
  const [activeTurn] = await db
    .select()
    .from(conversationTurns)
    .where(
      and(
        eq(conversationTurns.conversationId, conversationId),
        inArray(conversationTurns.status, ['collecting', 'scheduled', 'processing']),
      ),
    )
    .orderBy(desc(conversationTurns.createdAt))
    .limit(1);

  if (!activeTurn) {
    return { isTyping: false, status: 'idle' };
  }

  // If processing, verify lease has not expired
  if (activeTurn.status === 'processing') {
    const isLeaseValid = activeTurn.leaseExpiresAt && new Date(activeTurn.leaseExpiresAt) > now;
    if (isLeaseValid) {
      return {
        isTyping: true,
        status: 'processing',
        turnId: activeTurn.id,
        leaseExpiresAt: new Date(activeTurn.leaseExpiresAt!),
      };
    } else {
      // Lease expired, not currently actively typing (will be recovered on tick)
      return {
        isTyping: false,
        status: 'processing',
        turnId: activeTurn.id,
      };
    }
  }

  // If collecting or scheduled
  return {
    isTyping: true,
    status: activeTurn.status as TurnStatus,
    turnId: activeTurn.id,
    scheduledFor: new Date(activeTurn.scheduledFor),
  };
}
