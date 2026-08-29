import * as stylex from '@stylexjs/stylex';
import {colorVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {ArrowLeft} from 'lucide-react';
import {Divider} from '@astryxdesign/core/Divider';
import {PostCard} from '@/components/post-card';
import {CommentSection} from '@/components/comment-section';
import {requireUserId} from '@/lib/session';
import {getPostById, getPostComments} from '@/server/feed';

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
  divider: {
    marginBlock: spacingVars['--spacing-2'],
  },
});

export const dynamic = 'force-dynamic';

export default async function PostPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  const userId = await requireUserId();
  const post = await getPostById(userId, id);
  if (!post) notFound();

  const {topLevel, replies} = await getPostComments(userId, id);

  return (
    <div {...stylex.props(styles.root)}>
      <Link href="/feed" {...stylex.props(styles.backLink)}>
        <ArrowLeft size={16} />
        返回世界
      </Link>
      <PostCard post={post} />
      <Divider xstyle={styles.divider} />
      <CommentSection postId={id} topLevel={topLevel} replies={replies} />
    </div>
  );
}
