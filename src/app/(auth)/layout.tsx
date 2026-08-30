import * as stylex from '@stylexjs/stylex';
import {colorVars, fontWeightVars, radiusVars, shadowVars, spacingVars, textSizeVars} from '@astryxdesign/core/theme/tokens.stylex';
import {HStack, VStack} from '@astryxdesign/core/Stack';
import {Text} from '@astryxdesign/core/Text';
import Image from 'next/image';
import {redirect} from 'next/navigation';
import {getSession} from '@/lib/session';
import {NewWorldLogo} from '@/components/new-world-logo';

const styles = stylex.create({
  root: {
    position: 'relative',
    width: '100%',
    minHeight: '100dvh',
    overflow: 'hidden',
    isolation: 'isolate',
    padding: spacingVars['--spacing-4'],
    backgroundColor: colorVars['--color-background-body'],
    '@media (min-width: 768px)': {
      padding: spacingVars['--spacing-8'],
    },
  },
  backdrop: {
    zIndex: -1,
    objectFit: 'cover',
  },
  panel: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '29rem',
    overflow: 'hidden',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colorVars['--color-border'],
    borderRadius: radiusVars['--radius-container'],
    backgroundColor: colorVars['--color-background-card'],
    boxShadow: shadowVars['--shadow-high'],
    padding: spacingVars['--spacing-6'],
    '@media (min-width: 768px)': {
      padding: spacingVars['--spacing-8'],
    },
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  brand: {
    color: colorVars['--color-text-primary'],
  },
  brandName: {
    fontSize: textSizeVars['--font-size-lg'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '-0.02em',
  },
  brandCopy: {
    color: colorVars['--color-text-secondary'],
  },
  emailOnly: {
    marginInlineStart: 'auto',
    borderRadius: radiusVars['--radius-element'],
    backgroundColor: colorVars['--color-accent-muted'],
    color: colorVars['--color-text-accent'],
    fontSize: textSizeVars['--font-size-xs'],
    fontWeight: fontWeightVars['--font-weight-semibold'],
    letterSpacing: '0.08em',
    paddingBlock: spacingVars['--spacing-1'],
    paddingInline: spacingVars['--spacing-2'],
  },
  sprite: {
    display: 'none',
    position: 'absolute',
    zIndex: 0,
    width: '8rem',
    aspectRatio: '2 / 3',
    backgroundImage: "url('/candle-plush-sprite.png')",
    backgroundRepeat: 'no-repeat',
    backgroundSize: '300% auto',
    opacity: 0.22,
    pointerEvents: 'none',
    '@media (min-width: 640px)': {
      display: 'block',
    },
  },
  spriteTop: {
    insetBlockStart: '9rem',
    insetInlineStart: '-3rem',
    backgroundPosition: '0% 0%',
    transform: 'rotate(-10deg)',
  },
  spriteBottom: {
    insetBlockEnd: '-3rem',
    insetInlineStart: '2rem',
    backgroundPosition: '50% 100%',
    transform: 'rotate(8deg)',
  },
  spriteEnd: {
    insetBlockStart: '13rem',
    insetInlineEnd: '-3rem',
    backgroundPosition: '100% 0%',
    transform: 'rotate(10deg)',
  },
});

export default async function AuthLayout({children}: {children: React.ReactNode}) {
  const session = await getSession();
  if (session?.user) redirect('/feed');

  return (
    <VStack as="main" xstyle={styles.root} hAlign="center" vAlign="center" aria-label="新世界居民账户入口">
      <Image
        src="/auth-playful-world-background.png"
        alt=""
        fill
        priority
        sizes="100vw"
        {...stylex.props(styles.backdrop)}
      />
      <VStack as="section" xstyle={styles.panel} gap={0} aria-labelledby="auth-brand">
        <figure aria-hidden="true" {...stylex.props(styles.sprite, styles.spriteTop)} />
        <figure aria-hidden="true" {...stylex.props(styles.sprite, styles.spriteBottom)} />
        <figure aria-hidden="true" {...stylex.props(styles.sprite, styles.spriteEnd)} />
        <VStack xstyle={styles.content} gap={6}>
          <HStack as="header" xstyle={styles.brand} gap={2} vAlign="center">
            <NewWorldLogo size={36} />
            <VStack gap={0}>
              <Text id="auth-brand" xstyle={styles.brandName}>新世界居民</Text>
              <Text type="supporting" xstyle={styles.brandCopy}>New World Residents</Text>
            </VStack>
            <Text xstyle={styles.emailOnly}>邮箱账户</Text>
          </HStack>
          {children}
        </VStack>
      </VStack>
    </VStack>
  );
}
