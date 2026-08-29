'use server';

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  aiCharacters,
  aiMemories,
  conversations,
  groupMembers,
  groupMessages,
  groups,
  messages,
  user,
} from '@/db/schema';
import { requireUserId, getSession } from '@/lib/session';
import { resolveModel, resolveVisionModel } from '@/server/ai/core';
import { characterSystemPrompt, chatMemoryBlock } from '@/server/ai/prompts';
import { getRecentMessages, getMemories } from '@/server/ai/memory';
import { formatAttachmentPromptBlock } from '@/server/ai/vision';
import { buildPerceptionContext } from '@/server/ai/group/perception';
import {
  GROUP_COMMUNITY_RULES,
  formatGroupChatContextBlock,
  formatTimeAwarenessBlock,
  buildGroupDecisionSystemPrompt,
  GROUP_DECISION_SCHEMA_INSTRUCTION,
} from '@/server/ai/group/prompts';
import { getMediaForGroupMessages, type MediaAssetView } from '@/server/media';

export type ConversationDebugContext = {
  conversationId: string;
  character: {
    id: string;
    name: string;
    username: string;
    avatarEmoji: string;
    avatarColor: string;
    avatarUrl: string | null;
    persona: string;
    systemPrompt: string | null;
    expressionStyle: string;
    relationshipToUser: string;
  };
  model: {
    providerId: string;
    providerType: string;
    providerName: string;
    modelId: string;
    temperature: number | null;
    topP: number | null;
    maxTokens: number | null;
    supportsVision: boolean;
  };
  vision: {
    enabled: boolean;
    providerType?: string;
    modelId?: string;
  };
  systemPrompt: string;
  systemPromptComponents: {
    basePersonaPrompt: string;
    memoryBlock: string | null;
    rollingSummary: string | null;
  };
  contextMessages: Array<{
    index: number;
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    originalContent: string;
    attachmentsCount: number;
    attachments: Array<{
      id: string;
      filename: string | null;
      blobUrl: string;
      perceptionSummary: string | null;
      perceptionStatus: string | null;
      ocrText: string | null;
      imageType: string | null;
      profile: string | null;
    }>;
    charCount: number;
    estimatedTokens: number;
    createdAt: Date;
  }>;
  activeMemories: Array<{
    id: string;
    kind: string;
    content: string;
    importance: number;
    createdAt: Date;
  }>;
  rollingSummary: string | null;
  totalMessagesInConversation: number;
  estimatedTotalTokens: number;
};

export type GroupDebugContext = {
  groupId: string;
  groupName: string;
  selectedCharacter: {
    id: string;
    name: string;
    username: string;
    avatarEmoji: string;
    avatarColor: string;
    avatarUrl: string | null;
  };
  allAiMembers: Array<{
    id: string;
    name: string;
    username: string;
  }>;
  model: {
    providerId: string;
    providerType: string;
    providerName: string;
    modelId: string;
    temperature: number | null;
    supportsVision: boolean;
  };
  systemPrompt: string;
  timeAwarenessBlock: string;
  chatContextBlock: string;
  decisionInstruction: string;
  fullPromptPayload: string;
  unreadCount: number;
  lastReadAt: string;
  precedingCount: number;
  estimatedTokens: number;
};

/**
 * Fetch full verbatim debug context for a 1-on-1 DM conversation.
 */
export async function getConversationDebugContext(
  conversationId: string,
): Promise<{ ok: true; context: ConversationDebugContext } | { ok: false; error: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { ok: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;
    const userName = session.user.name || '你';

    const [conv] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .limit(1);

    if (!conv) {
      return { ok: false, error: '会话不存在' };
    }

    const [char] = await db
      .select()
      .from(aiCharacters)
      .where(eq(aiCharacters.id, conv.characterId))
      .limit(1);

    if (!char) {
      return { ok: false, error: '角色不存在' };
    }

    const [resolvedModel, visionModel, rawMemories, recentMsgs, [{ count }]] = await Promise.all([
      resolveModel(userId, char.id),
      resolveVisionModel(userId).catch(() => ({
        enabled: false,
        provider: { id: '', userId: '', name: '', providerType: 'openai', apiKey: '', baseUrl: null, isDefault: false, enabled: false, createdAt: new Date(), updatedAt: new Date() },
        modelId: '',
        supportsVision: false,
        temperature: null,
        topP: null,
        maxTokens: null,
      })),
      db
        .select()
        .from(aiMemories)
        .where(eq(aiMemories.characterId, char.id))
        .orderBy(desc(aiMemories.importance), desc(aiMemories.createdAt))
        .limit(20),
      getRecentMessages(conversationId, 30),
      db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(messages)
        .where(eq(messages.conversationId, conversationId)),
    ]);

    const memoryStrings = rawMemories.map((m) => m.content);
    const memoryBlock = chatMemoryBlock(memoryStrings, conv.summary);
    const basePersonaPrompt = characterSystemPrompt(char, userName);
    const systemPrompt = basePersonaPrompt + (memoryBlock ? `\n\n${memoryBlock}` : '');

    const chronologicalMsgs = [...recentMsgs].reverse();
    let totalChars = systemPrompt.length;

    const formattedMessages = chronologicalMsgs.map((m, idx) => {
      if (m.role === 'assistant') {
        totalChars += m.content.length;
        return {
          index: idx + 1,
          id: m.id,
          role: 'assistant' as const,
          content: m.content,
          originalContent: m.content,
          attachmentsCount: 0,
          attachments: [],
          charCount: m.content.length,
          estimatedTokens: Math.ceil(m.content.length * 0.7),
          createdAt: new Date(m.createdAt),
        };
      }

      // For user messages
      const attachments = m.attachments || [];
      const attachmentBlock = formatAttachmentPromptBlock(attachments);
      const userText = m.content.trim();
      const finalPayloadText = userText && attachmentBlock ? `${userText}\n\n${attachmentBlock}` : userText || attachmentBlock;
      totalChars += finalPayloadText.length;

      return {
        index: idx + 1,
        id: m.id,
        role: 'user' as const,
        content: finalPayloadText,
        originalContent: m.content,
        attachmentsCount: attachments.length,
        attachments: attachments.map((a) => ({
          id: a.id,
          filename: a.originalFilename,
          blobUrl: a.blobUrl,
          perceptionSummary: a.perception?.summary ?? null,
          perceptionStatus: a.perception?.status ?? null,
          ocrText: a.perception?.ocrText ?? null,
          imageType: a.imageType ?? null,
          profile: a.perception?.profile ?? null,
        })),
        charCount: finalPayloadText.length,
        estimatedTokens: Math.ceil(finalPayloadText.length * 0.7),
        createdAt: new Date(m.createdAt),
      };
    });

    return {
      ok: true,
      context: {
        conversationId,
        character: {
          id: char.id,
          name: char.name,
          username: char.username,
          avatarEmoji: char.avatarEmoji,
          avatarColor: char.avatarColor,
          avatarUrl: char.avatarUrl,
          persona: char.persona,
          systemPrompt: char.systemPrompt,
          expressionStyle: char.expressionStyle,
          relationshipToUser: char.relationshipToUser,
        },
        model: {
          providerId: resolvedModel.provider.id,
          providerType: resolvedModel.provider.providerType,
          providerName: resolvedModel.provider.name,
          modelId: resolvedModel.modelId,
          temperature: resolvedModel.temperature,
          topP: resolvedModel.topP,
          maxTokens: resolvedModel.maxTokens,
          supportsVision: resolvedModel.supportsVision,
        },
        vision: {
          enabled: visionModel.enabled,
          providerType: visionModel.provider?.providerType,
          modelId: visionModel.modelId,
        },
        systemPrompt,
        systemPromptComponents: {
          basePersonaPrompt,
          memoryBlock,
          rollingSummary: conv.summary,
        },
        contextMessages: formattedMessages,
        activeMemories: rawMemories.map((mem) => ({
          id: mem.id,
          kind: mem.kind,
          content: mem.content,
          importance: mem.importance,
          createdAt: new Date(mem.createdAt),
        })),
        rollingSummary: conv.summary,
        totalMessagesInConversation: count,
        estimatedTotalTokens: Math.ceil(totalChars * 0.7),
      },
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[getConversationDebugContext] error', err);
    return { ok: false, error };
  }
}

/**
 * Fetch full verbatim debug context for a Group Chat room.
 */
export async function getGroupDebugContext(
  groupId: string,
  characterId?: string,
): Promise<{ ok: true; context: GroupDebugContext } | { ok: false; error: string }> {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { ok: false, error: 'Unauthorized' };
    }
    const userId = session.user.id;
    const userName = session.user.name || '你';

    const [group] = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
      .limit(1);

    if (!group) {
      return { ok: false, error: '群聊不存在' };
    }

    const aiMembers = await db
      .select({
        member: groupMembers,
        char: aiCharacters,
      })
      .from(groupMembers)
      .innerJoin(aiCharacters, eq(groupMembers.characterId, aiCharacters.id))
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberType, 'ai')));

    if (aiMembers.length === 0) {
      return { ok: false, error: '群聊中暂无 AI 成员' };
    }

    const target = characterId
      ? aiMembers.find((m) => m.char.id === characterId) ?? aiMembers[0]
      : aiMembers[0];

    const { member, char } = target;

    const [resolvedModel, memories, perceptionCtx] = await Promise.all([
      resolveModel(userId, char.id),
      getMemories(char.id, 10),
      buildPerceptionContext(userId, groupId, char, member),
    ]);

    if (!perceptionCtx) {
      return { ok: false, error: '无法构建群聊感知上下文' };
    }

    const systemPrompt = buildGroupDecisionSystemPrompt(char, userName, memories);
    const timeAwarenessBlock = formatTimeAwarenessBlock(perceptionCtx);
    const chatContextBlock = formatGroupChatContextBlock(perceptionCtx);
    const decisionInstruction = GROUP_DECISION_SCHEMA_INSTRUCTION;

    const fullPromptPayload = `${timeAwarenessBlock}\n\n${chatContextBlock}\n\n${decisionInstruction}`;
    const totalChars = systemPrompt.length + fullPromptPayload.length;

    return {
      ok: true,
      context: {
        groupId,
        groupName: group.name,
        selectedCharacter: {
          id: char.id,
          name: char.name,
          username: char.username,
          avatarEmoji: char.avatarEmoji,
          avatarColor: char.avatarColor,
          avatarUrl: char.avatarUrl,
        },
        allAiMembers: aiMembers.map((m) => ({
          id: m.char.id,
          name: m.char.name,
          username: m.char.username,
        })),
        model: {
          providerId: resolvedModel.provider.id,
          providerType: resolvedModel.provider.providerType,
          providerName: resolvedModel.provider.name,
          modelId: resolvedModel.modelId,
          temperature: resolvedModel.temperature,
          supportsVision: resolvedModel.supportsVision,
        },
        systemPrompt,
        timeAwarenessBlock,
        chatContextBlock,
        decisionInstruction,
        fullPromptPayload,
        unreadCount: perceptionCtx.unreadCount,
        lastReadAt: perceptionCtx.lastReadAtFormatted,
        precedingCount: perceptionCtx.precedingMessages.length,
        estimatedTokens: Math.ceil(totalChars * 0.7),
      },
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[getGroupDebugContext] error', err);
    return { ok: false, error };
  }
}
