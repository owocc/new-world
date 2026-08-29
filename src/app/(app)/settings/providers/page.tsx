import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { providerConfigs } from '@/db/schema';
import { ProviderSettings } from '@/components/settings/provider-settings';
import { requireUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

export default async function ProvidersSettingsPage() {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(providerConfigs)
    .where(eq(providerConfigs.userId, userId));

  // newest first, default first
  rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <ProviderSettings
      providers={rows.map((p) => ({
        id: p.id,
        name: p.name,
        providerType: p.providerType,
        baseUrl: p.baseUrl,
        isDefault: p.isDefault,
        enabled: p.enabled,
        apiKeyMasked: maskKey(p.apiKey),
      }))}
    />
  );
}
