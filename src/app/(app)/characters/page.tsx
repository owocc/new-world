import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { UserPlus } from 'lucide-react';
import { db } from '@/db';
import { aiCharacters, aiRelationships, providerConfigs } from '@/db/schema';
import { CharacterCard, RelationshipEditor, type CharacterListItem } from '@/components/character-card';
import { EmptyState } from '@/components/ui';
import { requireUserId } from '@/lib/session';
import { PageContainer } from '@/components/page-container';

export const metadata = { title: 'AI 居民' };
export const dynamic = 'force-dynamic';

export default async function CharactersPage() {
  const userId = await requireUserId();
  const [characters, providers, relationships] = await Promise.all([
    db.select().from(aiCharacters).where(eq(aiCharacters.userId, userId)),
    db
      .select({ id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType })
      .from(providerConfigs)
      .where(eq(providerConfigs.userId, userId)),
    db.select().from(aiRelationships).where(eq(aiRelationships.userId, userId)),
  ]);

  const providerMap = new Map(providers.map((p) => [p.id, p]));
  const items: CharacterListItem[] = characters.map((c) => {
    const p = c.providerId ? providerMap.get(c.providerId) : undefined;
    return {
      ...c,
      modelLabel: p ? `${p.name} / ${c.modelId ?? '默认模型'}` : c.modelId ? `全局 / ${c.modelId}` : null,
    };
  });
  items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <PageContainer className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">AI 居民</h1>
        <Link
          href="/characters/new"
          className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent-600)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <UserPlus size={15} />
          新增居民
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-line surface">
          <EmptyState
            icon="👥"
            title="社区还没有居民"
            description="创建几个不同性格的 AI，让他们住进你的世界"
            action={{ label: '创建第一个 AI', href: '/characters/new' }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <RelationshipEditor
          characters={items.map((c) => ({
            id: c.id,
            name: c.name,
            avatarEmoji: c.avatarEmoji,
            avatarColor: c.avatarColor,
            avatarUrl: c.avatarUrl,
          }))}
          relationships={relationships.map((r) => ({
            id: r.id,
            fromCharacterId: r.fromCharacterId,
            toCharacterId: r.toCharacterId,
            kind: r.kind,
            note: r.note,
          }))}
        />
      )}
    </PageContainer>
  );
}
