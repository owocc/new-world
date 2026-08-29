'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as stylex from '@stylexjs/stylex';
import { colorVars, radiusVars, shadowVars } from '@astryxdesign/core/theme/tokens.stylex';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Button } from '@astryxdesign/core/Button';
import { Slider } from '@astryxdesign/core/Slider';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const styles = stylex.create({
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(4px)',
  },
  card: {
    position: 'relative',
    display: 'flex',
    width: '100%',
    maxWidth: 480,
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid',
    borderColor: colorVars['--color-border'],
    borderRadius: radiusVars['--radius-chat'],
    backgroundColor: colorVars['--color-background-surface'],
    boxShadow: shadowVars['--shadow-high'],
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBlock: 14,
    paddingInline: 16,
    borderBottom: '1px solid',
    borderBottomColor: colorVars['--color-border'],
    backgroundColor: colorVars['--color-background-surface'],
    userSelect: 'none',
    '@media (min-width: 640px)': {
      paddingInline: 20,
    },
  },
  headerGroup: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 12,
  },
  closeButton: {
    display: 'flex',
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radiusVars['--radius-full'],
    color: colorVars['--color-text-primary'],
    transitionProperty: 'background-color, color',
    transitionDuration: '175ms',
    ':hover': {
      backgroundColor: colorVars['--color-background-muted'],
    },
  },
  title: {
    color: colorVars['--color-text-primary'],
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
  },
  viewport: {
    position: 'relative',
    display: 'flex',
    height: 310,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 16,
    backgroundColor: 'color-mix(in srgb, var(--color-background-muted) 20%, transparent)',
    userSelect: 'none',
    '@media (min-width: 640px)': {
      height: 340,
      padding: 24,
    },
  },
  cropContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radiusVars['--radius-container'],
    boxShadow: shadowVars['--shadow-high'],
  },
  cropArea: {
    border: '2px solid #38bdf8 !important',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55) !important',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    columnGap: 12,
    paddingBlock: 14,
    paddingInline: 20,
    borderTop: '1px solid',
    borderTopColor: colorVars['--color-border'],
    backgroundColor: colorVars['--color-background-surface'],
    userSelect: 'none',
  },
  zoomButton: {
    padding: 4,
    color: colorVars['--color-text-secondary'],
    borderRadius: radiusVars['--radius-inner'],
    transitionProperty: 'background-color, color',
    transitionDuration: '175ms',
    ':hover': {
      color: colorVars['--color-text-primary'],
      backgroundColor: colorVars['--color-background-muted'],
    },
  },
  slider: {
    flex: 1,
  },
  divider: {
    display: 'none',
    height: 16,
    width: 1,
    marginLeft: 4,
    marginRight: 2,
    backgroundColor: colorVars['--color-border'],
    '@media (min-width: 640px)': {
      display: 'block',
    },
  },
  resetButton: {
    display: 'none',
    alignItems: 'center',
    columnGap: 4,
    paddingBlock: 4,
    paddingInline: 8,
    borderRadius: radiusVars['--radius-element'],
    color: colorVars['--color-text-secondary'],
    fontSize: 12,
    transitionProperty: 'background-color, color',
    transitionDuration: '175ms',
    ':hover': {
      color: colorVars['--color-text-primary'],
      backgroundColor: colorVars['--color-background-muted'],
    },
    '@media (min-width: 640px)': {
      display: 'flex',
    },
  },
});

export type PixelCrop = Area;

function createImage(url: string): Promise<HTMLImageElement> {
  const { promise, resolve, reject } = Promise.withResolvers<HTMLImageElement>();
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', (error) => reject(error));
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = url;
  return promise;
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  outputMime = 'image/jpeg',
  quality = 0.95,
): Promise<{ blob: Blob; url: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Ensure minimum valid dimensions
  const targetWidth = Math.max(1, Math.round(pixelCrop.width));
  const targetHeight = Math.max(1, Math.round(pixelCrop.height));

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  const { promise, resolve, reject } = Promise.withResolvers<{ blob: Blob; url: string }>();
  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error('Canvas cropping failed'));
        return;
      }
      const url = URL.createObjectURL(blob);
      resolve({ blob, url });
    },
    outputMime,
    quality,
  );
  return promise;
}

type BoxSize = { width: number; height: number };

function fitAspectBox(outer: BoxSize, aspect: number): BoxSize {
  const width = Math.min(outer.width, outer.height * aspect);
  return { width, height: width / aspect };
}

export interface MediaCropModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob, croppedPreviewUrl: string) => Promise<void> | void;
  /** Aspect ratio (width / height), default 1:1. E.g. 1/1, 16/9, 3/1, 4/3 */
  aspect?: number;
  /** Crop shape: 'rect' or 'round' */
  cropShape?: 'rect' | 'round';
  /** Title shown on top header */
  title?: string;
  /** Export MIME format, default image/jpeg */
  outputMime?: string;
  /** Export image quality 0..1, default 0.95 */
  quality?: number;
}

/**
 * Universal Media / Image Cropper Modal:
 * - Clean Twitter / X style square framing with outer padding (留白)
 * - Native ESC key & backdrop click dismissal
 * - Highly reusable for avatars, cover banners, posts, and multi-aspect media
 */
export function MediaCropModal({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
  aspect = 1,
  cropShape = 'rect',
  title = '编辑媒体',
  outputMime = 'image/jpeg',
  quality = 0.95,
}: MediaCropModalProps) {
  const [mounted, setMounted] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [viewportSize, setViewportSize] = useState<BoxSize | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Native ESC key listener to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !processing) {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, processing, onClose]);

  // Reset zoom & crop when image changes
  useEffect(() => {
    if (imageSrc) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [imageSrc]);

  useEffect(() => {
    if (!mounted || !isOpen) return;
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted, isOpen, imageSrc]);

  const onCropChange = (location: Point) => {
    setCrop(location);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(Math.max(1, Math.min(3, newZoom)));
  };

  const onCropCompleteCallback = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setProcessing(true);
    try {
      const { blob, url } = await getCroppedImg(imageSrc, croppedAreaPixels, outputMime, quality);
      await onConfirm(blob, url);
      onClose();
    } catch (err) {
      console.error('Failed to crop image', err);
    } finally {
      setProcessing(false);
    }
  };

  if (!mounted || !isOpen || !imageSrc) return null;

  return createPortal(
    <div
      {...stylex.props(styles.overlay)}
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) onClose();
      }}
    >
      {/* Self-contained Twitter/X Style Card Container */}
      <div {...stylex.props(styles.card)} onClick={(e) => e.stopPropagation()}>
        {/* Top Header: Back/Close button, Title, Apply button */}
        <div {...stylex.props(styles.header)}>
          <div {...stylex.props(styles.headerGroup)}>
            <button
              type="button"
              disabled={processing}
              onClick={onClose}
              {...stylex.props(styles.closeButton)}
              title="返回 (Esc)"
              aria-label="返回"
            >
              <ArrowLeft size={18} />
            </button>
            <h3 {...stylex.props(styles.title)}>{title}</h3>
          </div>

          <Button
            label={processing ? '应用中…' : '应用'}
            variant="primary"
            size="sm"
            isLoading={processing}
            isDisabled={processing}
            onClick={handleSave}
          />
        </div>

        {/* Center: Crop Viewport with comfortable Outer Padding (留白) */}
        <div ref={viewportRef} {...stylex.props(styles.viewport)}>
          {/* Inner Cropper Container, shaped to the crop aspect */}
          <div
            {...stylex.props(styles.cropContainer)}
            style={
              viewportSize
                ? {
                    width: fitAspectBox(viewportSize, aspect).width,
                    height: fitAspectBox(viewportSize, aspect).height,
                  }
                : undefined
            }
          >
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              minZoom={1}
              maxZoom={3}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              objectFit="cover"
              restrictPosition={true}
              onCropChange={onCropChange}
              onZoomChange={onZoomChange}
              onCropComplete={onCropCompleteCallback}
              classes={{
                cropAreaClassName: stylex.props(styles.cropArea).className,
              }}
            />
          </div>
        </div>

        {/* Bottom Bar: Clean Zoom Slider + Quick Reset */}
        <div {...stylex.props(styles.footer)}>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
            {...stylex.props(styles.zoomButton)}
            title="缩小"
          >
            <ZoomOut size={18} />
          </button>
          <div {...stylex.props(styles.slider)}>
            <Slider
              label="缩放"
              isLabelHidden
              min={100}
              max={300}
              step={1}
              value={Math.round(zoom * 100)}
              onChange={(val: number) => {
                setZoom(Math.max(1, Math.min(3, val / 100)));
              }}
              formatValue={(val: number) => `${(val / 100).toFixed(1)}x`}
              valueDisplay="text"
            />
          </div>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            {...stylex.props(styles.zoomButton)}
            title="放大"
          >
            <ZoomIn size={18} />
          </button>

          <div {...stylex.props(styles.divider)} />

          <button
            type="button"
            disabled={processing}
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
            {...stylex.props(styles.resetButton)}
            title="重置位置"
          >
            <RotateCcw size={14} />
            <span>重置</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Alias for backward compatibility
export const AvatarCropModal = MediaCropModal;
