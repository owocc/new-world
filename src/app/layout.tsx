import type {Metadata, Viewport} from 'next';
import {cookies} from 'next/headers';
import {Providers, type ThemeMode} from '@/components/providers';
import {PwaRegister} from '@/components/pwa-register';
import {getEffectiveTheme, THEME_COLOR} from '@/lib/theme-color';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  // theme-color 按主题 cookie + 系统深浅色 SSR 渲染进 <head>，
  // 首屏即为正确的状态栏颜色；客户端由 Providers 的 useThemeColorSync 实时更新
  const theme = await getEffectiveTheme();
  return {
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
    other: {
      'theme-color': THEME_COLOR[theme],
    },
  };
}

export const viewport: Viewport = {
  // theme-color 由下方按主题 cookie + 系统深浅色 SSR 渲染，
  // 客户端由 Providers 的 useThemeColorSync 在主题切换时实时更新
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

function parseMode(value?: string): ThemeMode {
  return value === 'dark' || value === 'light' ? value : 'system';
}

// 首帧绘制前运行的主题初始化（防闪烁兜底）：
// 1. 优先 localStorage 中保存的显式主题（cookie 丢失时仍能恢复用户选择，并回写 cookie）；
// 2. 否则沿用 SSR 按主题 cookie 渲染的 data-theme；
// 3. 都没有时按 prefers-color-scheme 解析（仅首帧兜底，水合后 Theme(system) 会
//    移除 data-theme，交还 light-dark() 继续跟随系统）。
const themeInitScript = `(function(){try{var d=document.documentElement;var stored=localStorage.getItem('theme');var t=stored==='light'||stored==='dark'?stored:d.getAttribute('data-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.setAttribute('data-theme',t);}else if(d.getAttribute('data-theme')!==t){d.setAttribute('data-theme',t);document.cookie='theme='+t+'; path=/; max-age=31536000; samesite=lax';}}catch(e){}})();`;

export default async function RootLayout({children}: {children: React.ReactNode}) {
  // The Theme provider syncs data-theme to <html>; rendering it here from the
  // cookie avoids a flash of the wrong color-scheme before hydration.
  const mode = parseMode((await cookies()).get('theme')?.value);

  return (
    <html lang="zh-CN" suppressHydrationWarning data-theme={mode === 'system' ? undefined : mode}>
      <body>
        <script dangerouslySetInnerHTML={{__html: themeInitScript}} />
        <Providers initialMode={mode}>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
