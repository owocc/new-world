'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/db';
import { modelConfigs, providerConfigs } from '@/db/schema';
import { requireUserId } from '@/lib/session';
import { PROVIDER_TYPES, type ProviderType } from '@/lib/providers-shared';
import { setSetting, type CommunityConfig } from '@/server/settings';

const providerSchema = z.object({
  name: z.string().trim().min(1, '名称必填').max(50),
  providerType: z.enum(PROVIDER_TYPES),
  apiKey: z.string().trim().min(1, 'API Key 必填').max(300),
  baseUrl: z.string().trim().max(300).optional().nullable(),
});

export async function createProvider(input: z.input<typeof providerSchema>) {
  const userId = await requireUserId();
  const parsed = providerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '创建失败' };
  }
  const id = crypto.randomUUID();
  const isFirst = !(await db.select({ id: providerConfigs.id }).from(providerConfigs).where(eq(providerConfigs.userId, userId)).limit(1)).length;
  await db.insert(providerConfigs).values({
    id,
    userId,
    ...parsed.data,
    baseUrl: parsed.data.baseUrl || null,
    isDefault: isFirst,
  });
  revalidatePath('/settings/providers');
  return { ok: true, id };
}

export async function updateProvider(
  id: string,
  input: Partial<z.input<typeof providerSchema>> & { enabled?: boolean; apiKey?: string },
) {
  const userId = await requireUserId();
  const [existing] = await db
    .select()
    .from(providerConfigs)
    .where(and(eq(providerConfigs.id, id), eq(providerConfigs.userId, userId)))
    .limit(1);
  if (!existing) return { error: 'Provider 不存在' };

  const patch: Partial<typeof providerConfigs.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.providerType !== undefined) patch.providerType = input.providerType;
  if (input.baseUrl !== undefined) patch.baseUrl = input.baseUrl || null;
  if (input.enabled !== undefined) patch.enabled = input.enabled;
  // only overwrite the key when a new one is provided; empty string keeps the old key
  if (input.apiKey !== undefined && input.apiKey.trim() !== '') patch.apiKey = input.apiKey.trim();

  await db
    .update(providerConfigs)
    .set(patch)
    .where(and(eq(providerConfigs.id, id), eq(providerConfigs.userId, userId)));
  revalidatePath('/settings/providers');
  return { ok: true };
}

export async function deleteProvider(id: string) {
  const userId = await requireUserId();
  await db
    .delete(providerConfigs)
    .where(and(eq(providerConfigs.id, id), eq(providerConfigs.userId, userId)));
  revalidatePath('/settings/providers');
  return { ok: true };
}

export async function setDefaultProvider(id: string) {
  const userId = await requireUserId();
  await db
    .update(providerConfigs)
    .set({ isDefault: false })
    .where(eq(providerConfigs.userId, userId));
  await db
    .update(providerConfigs)
    .set({ isDefault: true })
    .where(and(eq(providerConfigs.id, id), eq(providerConfigs.userId, userId)));
  revalidatePath('/settings/providers');
  return { ok: true };
}

const modelSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().trim().min(1, 'Model ID 必填').max(120),
  displayName: z.string().trim().max(80).optional().nullable(),
  inputPricePerMTok: z.coerce.number().min(0).max(10000).default(0),
  outputPricePerMTok: z.coerce.number().min(0).max(10000).default(0),
});

export async function saveModel(input: z.input<typeof modelSchema>) {
  const userId = await requireUserId();
  const parsed = modelSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '保存失败' };
  }
  const [owned] = await db
    .select({ id: providerConfigs.id })
    .from(providerConfigs)
    .where(and(eq(providerConfigs.id, parsed.data.providerId), eq(providerConfigs.userId, userId)))
    .limit(1);
  if (!owned) return { error: 'Provider 不存在' };

  await db
    .insert(modelConfigs)
    .values({
      id: crypto.randomUUID(),
      userId,
      providerId: parsed.data.providerId,
      modelId: parsed.data.modelId,
      displayName: parsed.data.displayName || null,
      inputPricePerMTok: parsed.data.inputPricePerMTok,
      outputPricePerMTok: parsed.data.outputPricePerMTok,
    })
    .onConflictDoUpdate({
      target: [modelConfigs.providerId, modelConfigs.modelId],
      set: {
        displayName: parsed.data.displayName || null,
        inputPricePerMTok: parsed.data.inputPricePerMTok,
        outputPricePerMTok: parsed.data.outputPricePerMTok,
      },
    });
  revalidatePath('/settings/models');
  return { ok: true };
}

export async function deleteModel(id: string) {
  const userId = await requireUserId();
  await db.delete(modelConfigs).where(and(eq(modelConfigs.id, id), eq(modelConfigs.userId, userId)));
  revalidatePath('/settings/models');
  return { ok: true };
}

const defaultAISchema = z.object({
  providerId: z.string().nullable(),
  modelId: z.string().nullable(),
  temperature: z.number().min(0).max(2).nullable(),
  topP: z.number().min(0).max(1).nullable(),
  maxTokens: z.number().int().min(50).max(16000).nullable(),
});

export async function saveDefaultAIConfig(input: z.input<typeof defaultAISchema>) {
  const userId = await requireUserId();
  const parsed = defaultAISchema.safeParse(input);
  if (!parsed.success) return { error: '保存失败' };
  await setSetting(userId, 'ai_default', parsed.data);
  revalidatePath('/settings/ai');
  return { ok: true };
}

export async function saveCommunityConfig(input: CommunityConfig) {
  const userId = await requireUserId();
  const parsed = z
    .object({
      enabled: z.boolean(),
      pulseIntervalMinutes: z.number().int().min(5).max(1440),
      maxActorsPerPost: z.number().int().min(0).max(10),
      aiReplyChainRate: z.number().min(0).max(1),
      maxPostsPerPulse: z.number().int().min(0).max(5),
    })
    .safeParse(input);
  if (!parsed.success) return { error: '保存失败' };
  await setSetting(userId, 'community', parsed.data);
  revalidatePath('/settings/ai');
  return { ok: true };
}

const profileSchema = z.object({
  name: z.string().trim().min(1, '昵称必填').max(50),
  bio: z.string().trim().max(200).default(''),
});

export async function updateProfile(input: z.input<typeof profileSchema>) {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? '保存失败' };
  const { user } = await import('@/db/schema');
  const { auth } = await import('@/lib/auth');
  await db
    .update(user)
    .set({ name: parsed.data.name, bio: parsed.data.bio || null, updatedAt: new Date() })
    .where(eq(user.id, userId));
  revalidatePath('/settings/account');
  revalidatePath('/feed');
  return { ok: true };
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  const userId = await requireUserId();
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, '新密码至少 8 位'),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? '修改失败' };

  const { auth } = await import('@/lib/auth');
  const { headers } = await import('next/headers');
  const res = await auth.api.changePassword({
    headers: await headers(),
    body: { currentPassword: input.currentPassword, newPassword: input.newPassword },
  });
  if (!res) return { error: '修改失败，请检查当前密码' };
  return { ok: true };
}
