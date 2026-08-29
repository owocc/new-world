'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import * as stylex from '@stylexjs/stylex';
import { colorVars, radiusVars, shadowVars } from '@astryxdesign/core/theme/tokens.stylex';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/utils';

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(4px)',
    transitionProperty: 'opacity',
    transitionDuration: '175ms',
  },
  toolbar: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    color: colorVars['--color-on-dark'],
    backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent)',
  },
  filename: {
    maxWidth: 448,
    overflow: 'hidden',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: 500,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dimensions: {
    marginLeft: 8,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  toolbarActions: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 8,
  },
  action: {
    display: 'flex',
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-full'],
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: colorVars['--color-on-dark'],
    transitionProperty: 'background-color',
    transitionDuration: '175ms',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
  },
  imageContainer: {
    display: 'flex',
    height: '100%',
    width: '100%',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'auto',
    padding: 16,
    cursor: 'zoom-out',
    '@media (min-width: 768px)': {
      padding: 40,
    },
  },
  image: {
    maxHeight: '85vh',
    maxWidth: '90vw',
    borderRadius: radiusVars['--radius-element'],
    objectFit: 'contain',
    boxShadow: shadowVars['--shadow-high'],
    transitionProperty: 'transform',
    transitionDuration: '175ms',
    userSelect: 'none',
    cursor: 'zoom-in',
  },
  imageZoomed: {
    maxWidth: 'none',
    transform: 'scale(1.25)',
    cursor: 'zoom-out',
  },
  captionBar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    backgroundImage: 'linear-gradient(to top, rgba(0, 0, 0, 0.75), transparent)',
    pointerEvents: 'none',
  },
  captionCard: {
    maxWidth: 640,
    padding: '8px 14px',
    borderRadius: radiusVars['--radius-container'],
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: 13,
    lineHeight: 1.5,
    textAlign: 'center',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'auto',
  },
  captionTag: {
    display: 'inline-block',
    fontSize: 11,
    fontWeight: 600,
    color: '#93c5fd',
    marginRight: 6,
  },
});

export function MediaLightbox({
  media,
  onClose,
}: {
  media: {
    url: string;
    originalFilename?: string | null;
    width?: number | null;
    height?: number | null;
    perception?: { summary?: string | null; ocrText?: string | null; status?: string } | null;
  } | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!media) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media, onClose]);

  if (!mounted || !media) return null;

  return createPortal(
    <div
      {...stylex.props(styles.overlay)}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top action bar */}
      <div {...stylex.props(styles.toolbar)}>
        <div {...stylex.props(styles.filename)}>
          {media.originalFilename || '图片预览'}
          {media.width && media.height ? (
            <span {...stylex.props(styles.dimensions)}>
              ({media.width} × {media.height})
            </span>
          ) : null}
        </div>

        <div {...stylex.props(styles.toolbarActions)}>
          <button
            type="button"
            onClick={() => setZoomed(!zoomed)}
            {...stylex.props(styles.action)}
            title={zoomed ? '适应屏幕' : '放大'}
          >
            {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            download={media.originalFilename || 'image'}
            {...stylex.props(styles.action)}
            title="下载原图"
          >
            <Download size={18} />
          </a>
          <button
            type="button"
            onClick={onClose}
            {...stylex.props(styles.action)}
            title="关闭 (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        {...stylex.props(styles.imageContainer)}
        onClick={onClose}
      >
        <img
          src={resolveMediaUrl(media.url) || media.url}
          alt={media.originalFilename || '预览图片'}
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(!zoomed);
          }}
          {...stylex.props(styles.image, zoomed && styles.imageZoomed)}
        />
      </div>

      {/* Bottom Perception Bar if Available */}
      {media.perception?.summary ? (
        <div {...stylex.props(styles.captionBar)}>
          <div {...stylex.props(styles.captionCard)}>
            <span {...stylex.props(styles.captionTag)}>AI 视觉感知</span>
            {media.perception.summary}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
