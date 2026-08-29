import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { modelConfigs, providerConfigs } from '@/db/schema';
import { ModelSettings } from '@/components/settings/model-settings';
import { requireUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ModelsSettingsPage() {
  const userId = await requireUserId();
  const [providers, models] = await Promise.all([
    db
      .select({ id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType })
      .from(providerConfigs)
      .where(eq(providerConfigs.userId, userId)),
    db.select().from(modelConfigs).where(eq(modelConfigs.userId, userId)),
  ]);

  const providerMap = new Map(providers.map((p) => [p.id, p.name]));

  return (
    <ModelSettings
      providers={providers}
      models={models
        .map((m) => ({
          id: m.id,
          providerId: m.providerId,
          providerName: providerMap.get(m.providerId) ?? '（已删除）',
          modelId: m.modelId,
          displayName: m.displayName,
          inputPricePerMTok: m.inputPricePerMTok,
          outputPricePerMTok: m.outputPricePerMTok,
        }))
        .sort((a, b) => a.providerName.localeCompare(b.providerName) || a.modelId.localeCompare(b.modelId))}
    />
  );
}
