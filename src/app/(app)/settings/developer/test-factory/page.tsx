import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { modelConfigs, providerConfigs } from '@/db/schema';
import { VisionTestFactory } from '@/components/settings/vision-test-factory';
import { requireUserId } from '@/lib/session';
import { getVisionConfig, DEFAULT_VISION_CONFIG } from '@/server/settings';

export const metadata = { title: '测试场' };
export const dynamic = 'force-dynamic';

export default async function AiTestFactoryPage() {
  const userId = await requireUserId();
  const [vision, providers, models] = await Promise.all([
    getVisionConfig(userId),
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
    <VisionTestFactory
      providers={providers}
      modelsByProvider={modelsByProvider}
      vision={vision ?? DEFAULT_VISION_CONFIG}
    />
  );
}
