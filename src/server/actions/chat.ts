'use server';

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/session';
import { getOrCreateConversation, markConversationRead } from '@/server/chat';

export async function openConversation(characterId: string): Promise<{ id?: string; error?: string }> {
  const userId = await requireUserId();
  const id = await getOrCreateConversation(userId, characterId);
  if (!id) return { error: '角色不存在' };
  return { id };
}

export async function markRead(conversationId: string) {
  const userId = await requireUserId();
  await markConversationRead(userId, conversationId);
  return { ok: true };
}
