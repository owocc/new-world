import {count, eq} from 'drizzle-orm';
import {db} from '@/db';
import {aiCharacters, aiMemories, aiRelationships, providerConfigs} from '@/db/schema';
import {requireUserId} from '@/lib/session';
import {CharacterManagePanel} from '@/components/character-manage-panel';
import type {CharacterListItem} from '@/components/character-card';

export const metadata = {title: '管理联系人'};
export const dynamic = 'force-dynamic';

export default async function CharactersManagePage() {
  const userId = await requireUserId();
  const [characters, providers, relationships, memoryCounts] = await Promise.all([
    db.select().from(aiCharacters).where(eq(aiCharacters.userId, userId)),
    db
      .select({id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType})
      .from(providerConfigs)
      .where(eq(providerConfigs.userId, userId)),
    db.select().from(aiRelationships).where(eq(aiRelationships.userId, userId)),
    db
      .select({characterId: aiMemories.characterId, count: count()})
      .from(aiMemories)
      .where(eq(aiMemories.userId, userId))
      .groupBy(aiMemories.characterId),
  ]);

  const providerMap = new Map(providers.map((p) => [p.id, p]));
  const memCountMap = new Map(memoryCounts.map((m) => [m.characterId, m.count]));

  const items: (CharacterListItem & { memoryCount?: number })[] = characters.map((c) => {
    const p = c.providerId ? providerMap.get(c.providerId) : undefined;
    return {
      ...c,
      modelLabel: p ? `${p.name} / ${c.modelId ?? '默认模型'}` : c.modelId ? `全局 / ${c.modelId}` : null,
      memoryCount: memCountMap.get(c.id) || 0,
    };
  });
  items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <CharacterManagePanel
      characters={items}
      providers={providers}
      relationships={relationships.map((r) => ({
        id: r.id,
        fromCharacterId: r.fromCharacterId,
        toCharacterId: r.toCharacterId,
        kind: r.kind,
        note: r.note,
      }))}
    />
  );
}
