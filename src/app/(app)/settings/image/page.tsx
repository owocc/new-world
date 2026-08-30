import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { providerConfigs } from '@/db/schema';
import { ImageGenSettings } from '@/components/settings/image-gen-settings';
import { requireUserId } from '@/lib/session';
import { getImageGenConfig, DEFAULT_IMAGE_GEN_CONFIG } from '@/server/settings';

export const metadata = { title: 'AI 生图配置' };
export const dynamic = 'force-dynamic';

export default async function AiImageGenPage() {
  const userId = await requireUserId();
  const [config, providers] = await Promise.all([
    getImageGenConfig(userId),
    db
      .select({
        id: providerConfigs.id,
        name: providerConfigs.name,
        providerType: providerConfigs.providerType,
      })
      .from(providerConfigs)
      .where(eq(providerConfigs.userId, userId)),
  ]);

  return <ImageGenSettings config={config ?? DEFAULT_IMAGE_GEN_CONFIG} providers={providers} />;
}
