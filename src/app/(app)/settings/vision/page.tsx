import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { modelConfigs, providerConfigs } from '@/db/schema';
import { VisionSettings } from '@/components/settings/vision-settings';
import { VisionProfileSettings } from '@/components/settings/vision-profile-settings';
import { requireUserId } from '@/lib/session';
import { getVisionConfig, DEFAULT_VISION_CONFIG } from '@/server/settings';
import { getVisionProfilesAction } from '@/server/actions/settings';

export const metadata = { title: '图片理解配置' };
export const dynamic = 'force-dynamic';

export default async function SettingsVisionPage() {
  const userId = await requireUserId();
  const [vision, providers, models, profilesRes] = await Promise.all([
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
    getVisionProfilesAction(),
  ]);

  const modelsByProvider: Record<string, string[]> = {};
  for (const m of models) {
    (modelsByProvider[m.providerId] ??= []).push(m.modelId);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <VisionSettings
        vision={vision ?? DEFAULT_VISION_CONFIG}
        providers={providers}
        modelsByProvider={modelsByProvider}
      />
      {profilesRes.ok && <VisionProfileSettings profiles={profilesRes.profiles} />}
    </div>
  );
}
