import * as stylex from '@stylexjs/stylex';
import {colorVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {and, eq} from 'drizzle-orm';
import {ArrowLeft} from 'lucide-react';
import {db} from '@/db';
import {aiCharacters, providerConfigs} from '@/db/schema';
import {CharacterDetail} from '@/components/character-detail';
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
    maxWidth: '47.5rem',
    marginInline: 'auto',
    paddingBottom: spacingVars['--spacing-12'],
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacingVars['--spacing-1-5'],
    marginBottom: spacingVars['--spacing-4'],
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-base'],
    transitionProperty: 'color',
    transitionDuration: '175ms',
    '@media (hover: hover)': {
      ':hover': {
        color: colorVars['--color-text-primary'],
      },
    },
  },
});

export const dynamic = 'force-dynamic';

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{id: string}>;
}) {
  const {id} = await params;
  const userId = await requireUserId();

  const [character] = await db
    .select()
    .from(aiCharacters)
    .where(and(eq(aiCharacters.id, id), eq(aiCharacters.userId, userId)))
    .limit(1);
  if (!character) notFound();

  const providers = await db
    .select({id: providerConfigs.id, name: providerConfigs.name, providerType: providerConfigs.providerType})
    .from(providerConfigs)
    .where(eq(providerConfigs.userId, userId));

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.content)}>
        <Link href="/characters" {...stylex.props(styles.backLink)}>
          <ArrowLeft size={16} />
          返回联系人
        </Link>
        <CharacterDetail character={{...character, modelLabel: null}} providers={providers} />
      </div>
    </div>
  );
}
