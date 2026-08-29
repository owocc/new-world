import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '我的世界 · My World',
    template: '%s · 我的世界',
  },
  description: '一个只属于你的 AI 社区',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0e' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // theme lives in a cookie so the class is rendered server-side (no FOUC, no inline script)
  const theme = (await cookies()).get('theme')?.value === 'dark' ? 'dark' : '';

  return (
    <html lang="zh-CN" suppressHydrationWarning className={theme}>
      <body>
        {children}
        <Toaster position="top-center" richColors toastOptions={{ style: { borderRadius: '12px' } }} />
      </body>
    </html>
  );
}
