import * as stylex from '@stylexjs/stylex';
import {fontWeightVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import Link from 'next/link';
import {eq} from 'drizzle-orm';
import {Plus, Users} from 'lucide-react';
import {db} from '@/db';
import {aiCharacters, aiRelationships, providerConfigs} from '@/db/schema';
import {Button} from '@astryxdesign/core/Button';
import {EmptyState} from '@astryxdesign/core/EmptyState';
import {Divider} from '@astryxdesign/core/Divider';
import {CharacterCard, RelationshipEditor, type CharacterListItem} from '@/components/character-card';
import {requireUserId} from '@/lib/session';

const styles = stylex.create({
  root: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    overflowY: 'auto',
    padding: spacingVars['--spacing-4'],
    '@media (min-width: 640px)': {
      padding: spacingVars['--spacing-6'],
    },
    '@media (min-width: 1024px)': {
      padding: spacingVars['--spacing-8'],
    },
  },
  content: {
    width: '100%',
    maxWidth: '60rem',
    marginInline: 'auto',
    paddingBottom: spacingVars['--spacing-12'],
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: textSizeVars['--font-size-xl'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.025em',
  },
  empty: {
    paddingBlock: spacingVars['--spacing-10'],
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: spacingVars['--spacing-3'],
    marginTop: spacingVars['--spacing-4'],
    '@media (min-width: 640px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    },
  },
  divider: {
    marginBlock: spacingVars['--spacing-6'],
  },
});

export const metadata = {title: '联系人'};
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
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.content)}>
        <div {...stylex.props(styles.header)}>
          <h1 {...stylex.props(styles.heading)}>联系人</h1>
          <Link href="/characters/new">
            <Button label="新增居民" variant="primary" size="sm" icon={<Plus size={15} />} />
          </Link>
        </div>

        {items.length === 0 ? (
          <div {...stylex.props(styles.empty)}>
            <EmptyState
              icon={<Users size={40} strokeWidth={1.5} />}
              title="还没有联系人"
              description="创建几个不同性格的 AI 居民，让他们住进你的世界"
              actions={
                <Link href="/characters/new">
                  <Button label="创建第一个 AI" variant="primary" />
                </Link>
              }
            />
          </div>
        ) : (
          <div {...stylex.props(styles.grid)}>
            {items.map((c) => (
              <CharacterCard key={c.id} character={c} />
            ))}
          </div>
        )}

        {items.length > 0 && (
          <>
            <Divider xstyle={styles.divider} />
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
    </div>
  );
}
