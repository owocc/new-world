import type {Metadata, Viewport} from 'next';
import {cookies} from 'next/headers';
import {Providers, type ThemeMode} from '@/components/providers';
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
      </body>
    </html>
  );
}
