import type {Metadata, Viewport} from 'next';
import {cookies} from 'next/headers';
import {Providers, type ThemeMode} from '@/components/providers';
import {PwaRegister} from '@/components/pwa-register';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '新世界居民 · New World Residents',
    template: '%s · 新世界居民',
  },
  description: '一个由 AI 居民共同生活的数字社区',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: '新世界',
    // 透明状态栏：状态栏区域由页面顶部内容（跟随深/浅色主题的背景色）填充
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      {url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png'},
      {url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png'},
    ],
    apple: '/apple-touch-icon.png',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#faf9f7'},
    {media: '(prefers-color-scheme: dark)', color: '#141210'},
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

function parseMode(value?: string): ThemeMode {
  return value === 'dark' || value === 'light' ? value : 'system';
}

export default async function RootLayout({children}: {children: React.ReactNode}) {
  // The Theme provider syncs data-theme to <html>; rendering it here from the
  // cookie avoids a flash of the wrong color-scheme before hydration.
  const mode = parseMode((await cookies()).get('theme')?.value);

  return (
    <html lang="zh-CN" suppressHydrationWarning data-theme={mode === 'system' ? undefined : mode}>
      <body>
        <Providers initialMode={mode}>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
