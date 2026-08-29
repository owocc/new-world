'use client';

import { useState, useEffect } from 'react';
import { resolveMediaUrl } from '@/lib/utils';
import clsx from 'clsx';

export interface MediaImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  fallbackSrc?: string;
  className?: string;
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
      <div
        className={clsx(
          'flex items-center justify-center bg-neutral text-secondary text-xs select-none',
          className,
        )}
      >
        <span>暂无图片</span>
      </div>
    );
  }

  return (
    <img
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
