'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@astryxdesign/core/Button';
import { resolveMediaUrl } from '@/lib/utils';
import type { MediaAssetView } from '@/server/media';

export function MediaLightbox({
  media,
  onClose,
}: {
  media: { url: string; originalFilename?: string | null; width?: number | null; height?: number | null } | null;
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
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top action bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between p-4 text-white z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="text-sm font-medium truncate max-w-md text-white/90">
          {media.originalFilename || '图片预览'}
          {media.width && media.height ? (
            <span className="text-xs text-white/60 ml-2">
              ({media.width} × {media.height})
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomed(!zoomed)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={zoomed ? '适应屏幕' : '放大'}
          >
            {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
          </button>
          <a
            href={media.url}
            target="_blank"
            rel="noopener noreferrer"
            download={media.originalFilename || 'image'}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="下载原图"
          >
            <Download size={18} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="关闭 (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        className="flex-1 w-full h-full flex items-center justify-center p-4 md:p-10 overflow-auto cursor-zoom-out"
        onClick={onClose}
      >
        <img
          src={resolveMediaUrl(media.url) || media.url}
          alt={media.originalFilename || '预览图片'}
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(!zoomed);
          }}
          className={`transition-transform duration-200 select-none rounded-lg shadow-2xl ${
            zoomed
              ? 'max-w-none scale-125 cursor-zoom-out'
              : 'max-h-[85vh] max-w-[90vw] object-contain cursor-zoom-in'
          }`}
        />
      </div>
    </div>,
    document.body,
  );
}
