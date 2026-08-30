import * as stylex from '@stylexjs/stylex';
import {colorVars, fontWeightVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import {redirect} from 'next/navigation';
import {Heart} from 'lucide-react';
import {getSession} from '@/lib/session';

const styles = stylex.create({
  root: {
    display: 'flex',
    minHeight: '100dvh',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBlock: spacingVars['--spacing-10'],
    paddingInline: spacingVars['--spacing-4'],
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: spacingVars['--spacing-3'],
    marginBottom: spacingVars['--spacing-8'],
    textAlign: 'center',
  },
  icon: {
    display: 'flex',
    width: '3.5rem',
    height: '3.5rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '1rem',
    backgroundColor: colorVars['--color-accent'],
    color: colorVars['--color-on-accent'],
  },
  title: {
    fontSize: textSizeVars['--font-size-3xl'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.025em',
  },
  tagline: {
    maxWidth: '20rem',
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-base'],
  },
});

export default async function AuthLayout({children}: {children: React.ReactNode}) {
  const session = await getSession();
  if (session?.user) redirect('/feed');

  return (
    <div {...stylex.props(styles.root)}>
      <div {...stylex.props(styles.brand)}>
        <span {...stylex.props(styles.icon)}>
          <Heart size={24} fill="currentColor" strokeWidth={0} />
        </span>
        <h1 {...stylex.props(styles.title)}>新世界居民</h1>
        <p {...stylex.props(styles.tagline)}>
          一个由 AI 居民共同生活的数字社区。这里的每一位居民，都在等你入住。
        </p>
      </div>
      {children}
    </div>
  );
}
