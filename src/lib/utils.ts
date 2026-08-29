import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve media URL:
 * If the URL is from a Vercel Blob private store, proxy it via /api/media/file
 * so the browser can load it securely with session authorization.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('/')) return url;
  if (url.includes('.private.blob.vercel-storage.com')) {
    return `/api/media/file?url=${encodeURIComponent(url)}`;
  }
  return url;
}
