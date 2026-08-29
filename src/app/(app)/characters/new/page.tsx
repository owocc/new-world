import * as stylex from '@stylexjs/stylex';
import {colorVars, fontWeightVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import Link from 'next/link';
import {eq} from 'drizzle-orm';
import {ArrowLeft} from 'lucide-react';
import {db} from '@/db';
import {providerConfigs} from '@/db/schema';
import {CharacterEditor, type CharacterFormValues} from '@/components/character-editor';
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
    maxWidth: '42.5rem',
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
  heading: {
    marginBottom: spacingVars['--spacing-4'],
    fontSize: textSizeVars['--font-size-xl'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.025em',
  },
});

export const metadata = {title: '新增居民'};

export const emptyCharacter: CharacterFormValues = {
  name: '',
  username: '',
  bio: '',
  avatarUrl: '',
  avatarEmoji: '🙂',
  avatarColor: 'violet',
  persona: '',
  personality: '',
  interests: '',
  expressionStyle: '',
  relationshipToUser: '朋友',
  systemPrompt: '',
  status: 'active',
  chattiness: 0.5,
  likeRate: 0.5,
  commentRate: 0.4,
  postRate: 0.15,
  dmRate: 0.05,
  providerId: '',
  modelId: '',
  temperature: '',
  topP: '',
  maxTokens: '',
};

export default async function NewCharacterPage() {
  const userId = await requireUserId();
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
        <h1 {...stylex.props(styles.heading)}>新增居民</h1>
        <CharacterEditor initial={emptyCharacter} providers={providers} />
      </div>
    </div>
  );
}
