'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Button } from '@astryxdesign/core/Button';
import { Slider } from '@astryxdesign/core/Slider';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [processing, setProcessing] = useState(false);

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

  const onCropChange = (location: Point) => {
    setCrop(location);
  };

  const onZoomChange = (newZoom: number) => {
    const clamped = Math.max(1, Math.min(3, newZoom));
    setZoom(clamped);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !processing) onClose();
      }}
    >
      {/* Self-contained Twitter/X Style Card Container */}
      <div
        className="relative flex flex-col w-full max-w-[480px] overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Back/Close button, Title, Apply button */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-border bg-surface select-none">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={processing}
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-primary hover:bg-muted transition-colors"
              title="返回 (Esc)"
              aria-label="返回"
            >
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-base font-semibold text-primary leading-none">{title}</h3>
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
        <div className="relative w-full h-[310px] sm:h-[340px] bg-muted/20 p-4 sm:p-6 flex items-center justify-center select-none overflow-hidden">
          {/* Inner Cropper Container */}
          <div
            className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner"
            style={{ position: 'relative' }}
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
                cropAreaClassName: '!border-2 !border-sky-400 !shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]',
              }}
            />
          </div>
        </div>

        {/* Bottom Bar: Clean Zoom Slider + Quick Reset */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-surface border-t border-border select-none">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
            className="p-1 text-secondary hover:text-primary transition-colors rounded hover:bg-muted"
            title="缩小"
          >
            <ZoomOut size={18} />
          </button>
          <div className="flex-1">
            <Slider
              label="缩放"
              isLabelHidden
              min={100}
              max={300}
              step={1}
              value={Math.round(zoom * 100)}
              onChange={(val: number) => {
                const nextZoom = Math.max(1, Math.min(3, val / 100));
                setZoom(nextZoom);
              }}
              formatValue={(val: number) => `${(val / 100).toFixed(1)}x`}
              valueDisplay="text"
            />
          </div>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-1 text-secondary hover:text-primary transition-colors rounded hover:bg-muted"
            title="放大"
          >
            <ZoomIn size={18} />
          </button>

          <div className="h-4 w-px bg-border ml-1 mr-0.5 hidden sm:block" />

          <button
            type="button"
            disabled={processing}
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="hidden sm:flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-muted"
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
