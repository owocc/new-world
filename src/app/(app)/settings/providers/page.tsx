import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { modelConfigs, providerConfigs } from '@/db/schema';
import { ProviderSettings, type ProviderModelRow } from '@/components/settings/provider-settings';
import { requireUserId } from '@/lib/session';

export const dynamic = 'force-dynamic';

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

export default async function AiProvidersPage() {
  const userId = await requireUserId();
  const [rows, models] = await Promise.all([
    db
      .select()
      .from(providerConfigs)
      .where(eq(providerConfigs.userId, userId)),
    db
      .select({
        id: modelConfigs.id,
        providerId: modelConfigs.providerId,
        modelId: modelConfigs.modelId,
        displayName: modelConfigs.displayName,
        inputPricePerMTok: modelConfigs.inputPricePerMTok,
        outputPricePerMTok: modelConfigs.outputPricePerMTok,
      })
      .from(modelConfigs)
      .where(eq(modelConfigs.userId, userId)),
  ]);

  // newest first, default first
  rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || b.createdAt.getTime() - a.createdAt.getTime());

  const modelsByProvider: Record<string, ProviderModelRow[]> = {};
  for (const m of models) {
    (modelsByProvider[m.providerId] ??= []).push({
      id: m.id,
      modelId: m.modelId,
      displayName: m.displayName,
      inputPricePerMTok: m.inputPricePerMTok,
      outputPricePerMTok: m.outputPricePerMTok,
    });
  }

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
      modelsByProvider={modelsByProvider}
    />
  );
}
