import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { modelConfigs, providerConfigs } from '@/db/schema';
import { GeneralSettings } from '@/components/settings/general-settings';
import { requireUserId } from '@/lib/session';
import { getDefaultAIConfig, getCommunityConfig, DEFAULT_COMMUNITY_CONFIG } from '@/server/settings';
import { getUserProfile } from '@/server/feed';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [profile, defaultAI, community, providers, models] = await Promise.all([
    getUserProfile(userId),
    getDefaultAIConfig(userId),
    getCommunityConfig(userId),
    db
      .select({ id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType })
      .from(providerConfigs)
      .where(eq(providerConfigs.userId, userId)),
    db.select().from(modelConfigs).where(eq(modelConfigs.userId, userId)),
  ]);

  const modelsByProvider: Record<string, string[]> = {};
  for (const m of models) {
    (modelsByProvider[m.providerId] ??= []).push(m.modelId);
  }

  return (
    <GeneralSettings
      profile={{ name: profile?.name ?? '', bio: profile?.bio ?? null }}
      defaultAI={defaultAI}
      community={community ?? DEFAULT_COMMUNITY_CONFIG}
      providers={providers}
      modelsByProvider={modelsByProvider}
    />
  );
}
