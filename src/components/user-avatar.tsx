'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as stylex from '@stylexjs/stylex';
import { colorVars, radiusVars } from '@astryxdesign/core/theme/tokens.stylex';
import { resolveMediaUrl } from '@/lib/utils';

/**
 * App avatar: Astryx Avatar for image avatars, with a gradient + emoji
 * fallback for AI residents. Identity colors live here (not in the theme)
 * since they belong to the characters, not to the UI.
 */
const styles = stylex.create({
  root: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radiusVars['--radius-full'],
    userSelect: 'none',
  },
  image: {
    height: '100%',
    width: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
  },
  fallback: {
    lineHeight: 1,
    color: colorVars['--color-on-dark'],
    fontWeight: 500,
  },
  link: {
    display: 'inline-flex',
    flexShrink: 0,
    borderRadius: radiusVars['--radius-full'],
  },
});
const GRADIENTS: Record<string, string> = {
  violet: 'linear-gradient(135deg,#8b5cf6,#6366f1)',
  rose: 'linear-gradient(135deg,#fb7185,#e11d48)',
  indigo: 'linear-gradient(135deg,#818cf8,#4f46e5)',
  emerald: 'linear-gradient(135deg,#34d399,#059669)',
  amber: 'linear-gradient(135deg,#fbbf24,#d97706)',
  sky: 'linear-gradient(135deg,#38bdf8,#0284c7)',
  teal: 'linear-gradient(135deg,#2dd4bf,#0d9488)',
  fuchsia: 'linear-gradient(135deg,#e879f9,#c026d3)',
};

export const AVATAR_COLORS = Object.keys(GRADIENTS);

export function UserAvatar({
  name,
  emoji,
  color,
  url,
  size = 40,
  href,
  tooltip = true,
  className,
  xstyle,
}: {
  name: string;
  emoji?: string | null;
  color?: string | null;
  url?: string | null;
  size?: number;
  href?: string;
  tooltip?: boolean | string;
  className?: string;
  xstyle?: stylex.StyleXStyles;
}) {
  const [imgError, setImgError] = useState(false);
  const finalUrl = resolveMediaUrl(url);

  useEffect(() => {
    setImgError(false);
  }, [url]);

  const gradient = GRADIENTS[color ?? 'violet'] ?? GRADIENTS.violet;
  const showImage = Boolean(finalUrl && !imgError);
  const inner = (
    <span
      {...stylex.props(styles.root, xstyle)}
      className={className}
      style={{
        width: size,
        height: size,
        background: showImage ? 'transparent' : gradient,
        fontSize: Math.round(size * 0.48),
      }}
      role={href ? undefined : 'img'}
      aria-label={name}
      title={tooltip === false ? undefined : tooltip === true ? name : tooltip}
    >
      {showImage ? (
        <img
          src={finalUrl!}
          alt={name}
          onError={() => setImgError(true)}
          {...stylex.props(styles.image)}
        />
      ) : (
        <span {...stylex.props(styles.fallback)}>
          {emoji || name.slice(0, 1) || '✨'}
        </span>
      )}
    </span>
  );

  if (!href) return inner;
  return (
    <Link href={href} aria-label={name} {...stylex.props(styles.link)}>
      {inner}
    </Link>
  );
}
