import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve media URL:
 * If the URL is from Vercel Blob store (private or public), proxy it via /api/media/file
 * so the browser can load it securely with session & token authorization without CORS or 403 issues.
 */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('/api/')) return url;
  if (
    url.includes('vercel-storage.com') ||
    url.includes('blob.vercel-storage.com') ||
    url.includes('.private.blob.vercel-storage.com')
  ) {
    return `/api/media/file?url=${encodeURIComponent(url)}`;
  }
  return url;
}
