'use client';

import { useState, useEffect } from 'react';
import * as stylex from '@stylexjs/stylex';
import { textSizeVars, colorVars } from '@astryxdesign/core/theme/tokens.stylex';
import { resolveMediaUrl } from '@/lib/utils';

const styles = stylex.create({
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorVars['--color-neutral'],
    color: colorVars['--color-text-secondary'],
    fontSize: textSizeVars['--font-size-xs'],
    userSelect: 'none',
  },
});

export interface MediaImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
  xstyle?: stylex.StyleXStyles;
}

/**
 * Reusable Media Image Component:
 * - Automatically resolves Vercel Blob & private URLs via authenticated proxy (/api/media/file)
 * - Handles image load error with fallbackSrc or subtle placeholder
 * - Safe for avatars, covers, attachments and post images
 */
export function MediaImage({
  src,
  alt = '图片',
  fallbackSrc,
  className,
  xstyle,
  onError,
  ...props
}: MediaImageProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedSrc = resolveMediaUrl(src);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const targetSrc = hasError && fallbackSrc ? fallbackSrc : resolvedSrc;

  if (!targetSrc || (hasError && !fallbackSrc)) {
    return (
      <div {...stylex.props(styles.placeholder, xstyle)} className={className}>
        <span>暂无图片</span>
      </div>
    );
  }

  return (
    <img
      {...stylex.props(xstyle)}
      src={targetSrc}
      alt={alt}
      className={className}
      onError={(e) => {
        setHasError(true);
        onError?.(e);
      }}
      {...props}
    />
  );
}
