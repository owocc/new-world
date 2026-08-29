import Link from 'next/link';
import {eq} from 'drizzle-orm';
import {Plus} from 'lucide-react';
import {db} from '@/db';
import {aiCharacters, aiRelationships, providerConfigs} from '@/db/schema';
import {Button} from '@astryxdesign/core/Button';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Divider} from '@astryxdesign/core/Divider';
import {Users} from 'lucide-react';
import {CharacterCard, RelationshipEditor, type CharacterListItem} from '@/components/character-card';
import {requireUserId} from '@/lib/session';

export const metadata = {title: 'AI 居民'};
export const dynamic = 'force-dynamic';

export default async function CharactersPage() {
  const userId = await requireUserId();
  const [characters, providers, relationships] = await Promise.all([
    db.select().from(aiCharacters).where(eq(aiCharacters.userId, userId)),
    db
      .select({id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType})
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
    <div className="mx-auto w-full max-w-[960px] px-4 pb-10 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">居民</h1>
        <Link href="/characters/new">
          <Button label="新增居民" variant="primary" size="sm" icon={<Plus size={15} />} />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-10">
          <EmptyState
            icon={<Users size={40} strokeWidth={1.5} />}
            title="社区还没有居民"
            description="创建几个不同性格的 AI，让他们住进你的世界"
            actions={
              <Link href="/characters/new">
                <Button label="创建第一个 AI" variant="primary" />
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((c) => (
            <CharacterCard key={c.id} character={c} />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <>
          <Divider className="my-6" />
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
        </>
      )}
    </div>
  );
}
