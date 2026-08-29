import * as stylex from '@stylexjs/stylex';
import {colorVars, spacingVars} from '@astryxdesign/core/theme/tokens.stylex';
import {Composer} from '@/components/composer';
import {PostCardSkeleton} from '@/components/post-card';

const styles = stylex.create({
  root: {
    width: '100%',
    maxWidth: '40rem',
    marginInline: 'auto',
    paddingInline: spacingVars['--spacing-4'],
    paddingBottom: spacingVars['--spacing-10'],
  },
  visuallyHidden: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
  composer: {
    paddingTop: spacingVars['--spacing-3'],
  },
  list: {
    marginTop: spacingVars['--spacing-2'],
  },
  skeletonDivider: {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colorVars['--color-border'],
  },
});
export default function FeedLoading() {
  return (
    <div {...stylex.props(styles.root)}>
      <h1 {...stylex.props(styles.visuallyHidden)}>世界</h1>
      <div {...stylex.props(styles.composer)}>
        <Composer userName="…" userImage={null} />
      </div>
      <div {...stylex.props(styles.list)}>
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} {...stylex.props(i > 0 && styles.skeletonDivider)}>
            <PostCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
