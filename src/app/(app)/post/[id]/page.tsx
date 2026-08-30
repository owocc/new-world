import * as stylex from '@stylexjs/stylex';
import {colorVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft, Heart} from 'lucide-react';
import {Divider} from '@astryxdesign/core/Divider';
import {Text} from '@astryxdesign/core/Text';
import {HStack} from '@astryxdesign/core/Stack';
import {PostCard} from '@/components/post-card';
import {CommentSection} from '@/components/comment-section';
import {UserAvatar} from '@/components/user-avatar';
import {requireUserId} from '@/lib/session';
import {getPostById, getPostComments, getPostLikers} from '@/server/feed';

const styles = stylex.create({
  root: {
    width: '100%',
    maxWidth: '40rem',
    marginInline: 'auto',
    paddingInline: spacingVars['--spacing-4'],
    paddingTop: spacingVars['--spacing-4'],
    paddingBottom: spacingVars['--spacing-10'],
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: spacingVars['--spacing-1-5'],
    marginBottom: spacingVars['--spacing-2'],
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
  likersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacingVars['--spacing-2'],
    paddingInline: spacingVars['--spacing-1'],
  },
  likerStack: {
    display: 'flex',
    alignItems: 'center',
  },
  likerAvatar: {
    borderRadius: '9999px',
    border: '2px solid var(--color-background-body)',
    '@media (min-width: 640px)': {
      border: '2px solid var(--color-background-body)',
    },
  },
  likerAvatarOverlap: {
    marginInlineStart: -8,
  },
  likerName: {
    fontSize: textSizeVars['--font-size-sm'],
    color: colorVars['--color-text-secondary'],
  },
  divider: {
    marginBlock: spacingVars['--spacing-2'],
  },
});

export const dynamic = 'force-dynamic';

function LikersRow({likers}: {likers: Awaited<ReturnType<typeof getPostLikers>>}) {
  if (likers.length === 0) return null;
  const shown = likers.slice(0, 12);
  const overflow = likers.length - shown.length;
  const names = likers.map((l) => l.name);

  return (
    <HStack gap={2} vAlign="center" width="100%" xstyle={styles.likersRow}>
      <Heart size={14} fill="currentColor" color="var(--color-error)" />
      <div {...stylex.props(styles.likerStack)}>
        {shown.map((liker, index) => (
          <span key={`${liker.authorType}-${liker.characterId ?? 'me'}`} {...stylex.props(index > 0 && styles.likerAvatarOverlap)}>
            <UserAvatar
              name={liker.name}
              emoji={liker.avatarEmoji}
              color={liker.avatarColor}
              url={liker.avatarUrl}
              size={22}
              href={liker.authorType === 'ai' && liker.characterId ? `/characters/${liker.characterId}` : undefined}
              xstyle={styles.likerAvatar}
            />
          </span>
        ))}
      </div>
      <Text type="supporting" size="sm" as="span" xstyle={styles.likerName}>
        {overflow > 0 ? `${names.slice(0, 3).join('、')}等 ${likers.length} 人觉得很赞` : names.slice(0, 5).join('、') + (likers.length > 5 ? ` 等 ${likers.length} 人觉得很赞` : ' 觉得很赞')}
      </Text>
    </HStack>
  );
}

export default async function PostPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const userId = await requireUserId();
  const post = await getPostById(userId, id);
  if (!post) notFound();

  const [{comments}, likers] = await Promise.all([
    getPostComments(userId, id),
    getPostLikers(userId, id),
  ]);

  return (
    <div {...stylex.props(styles.root)}>
      <Link href="/feed" {...stylex.props(styles.backLink)}>
        <ArrowLeft size={16} />
        返回世界
      </Link>
      <PostCard post={post} />
      <LikersRow likers={likers} />
      <Divider xstyle={styles.divider} />
      <CommentSection postId={id} comments={comments} />
    </div>
  );
}
