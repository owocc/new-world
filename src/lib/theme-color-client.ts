'use client';

import { useEffect } from 'react';
import type { ReactElement } from 'react';

export type ThemeColorMode = 'light' | 'dark' | 'system';

// 与应用表面色一致（--color-background-surface，见 src/theme/my-world.js）：
// Android PWA 状态栏色带由 theme-color 填充，必须与页面顶部背景完全一致才无缝隙。
// 服务端（SSR meta / manifest）的同一取值见 src/lib/theme-color.ts。
const THEME_COLORS = {light: '#FFFBF8', dark: '#1F1B18'} as const;

function resolveColor(mode: ThemeColorMode, systemPrefersDark: boolean): string {
  const dark = mode === 'dark' || (mode === 'system' && systemPrefersDark);
  return dark ? THEME_COLORS.dark : THEME_COLORS.light;
}

/**
 * 立即把状态栏颜色（<meta name="theme-color">）应用为当前主题对应的值。
 * meta 不存在时自动补建一个，保证任何页面都能被客户端修正。
 */
export function applyStatusBarTheme(mode: ThemeColorMode): void {
  const color = resolveColor(mode, window.matchMedia('(prefers-color-scheme: dark)').matches);
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

/**
 * 客户端状态栏颜色同步：跟随主题切换实时更新，
 * system 模式下监听系统深浅色变化实时响应。
 */
export function useThemeColorSync(mode: ThemeColorMode): void {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyStatusBarTheme(mode);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
}

/**
 * ThemeColorSync 客户端组件：渲染为 null，
 * 挂载在 Providers 中让 <meta name="theme-color"> 始终跟随 App 实际主题
 * （而非系统主题），主题切换后状态栏颜色立即更新。
 */
export function ThemeColorSync({ mode }: { mode: ThemeColorMode }): ReactElement | null {
  useThemeColorSync(mode);
  return null;
}
