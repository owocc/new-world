import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { modelConfigs, providerConfigs } from '@/db/schema';
import { AiDefaultsSettings } from '@/components/settings/ai-defaults-settings';
import { requireUserId } from '@/lib/session';
import { getDefaultAIConfig, getCommunityConfig, DEFAULT_COMMUNITY_CONFIG } from '@/server/settings';

export const metadata = { title: '默认配置' };
export const dynamic = 'force-dynamic';

export default async function AiDefaultsPage() {
  const userId = await requireUserId();
  const [defaultAI, community, providers, models] = await Promise.all([
    getDefaultAIConfig(userId),
    getCommunityConfig(userId),
    db
      .select({
        id: providerConfigs.id,
        name: providerConfigs.name,
        providerType: providerConfigs.providerType,
      })
      .from(providerConfigs)
      .where(eq(providerConfigs.userId, userId)),
    db.select().from(modelConfigs).where(eq(modelConfigs.userId, userId)),
  ]);

  const modelsByProvider: Record<string, string[]> = {};
  for (const m of models) {
    (modelsByProvider[m.providerId] ??= []).push(m.modelId);
  }

  return (
    <AiDefaultsSettings
      defaultAI={defaultAI}
      community={community ?? DEFAULT_COMMUNITY_CONFIG}
      providers={providers}
      modelsByProvider={modelsByProvider}
    />
  );
}
