'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Theme} from '@astryxdesign/core';
import {LinkProvider} from '@astryxdesign/core/Link';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import NextLink from 'next/link';
import zhCN from '@astryxdesign/core/locales/zh-CN.json';
import {myWorldTheme} from '@/theme/my-world.js';
import '@/theme/my-world.css';

export type ThemeMode = 'light' | 'dark' | 'system';

// 与应用表面色一致（--color-background-surface，见 src/theme/my-world.js），
// Android PWA 状态栏由 theme-color 填充，必须与页面顶部背景完全一致才无缝隙
const THEME_COLORS = {light: '#FFFBF8', dark: '#1F1B18'} as const;

// 始终把两条 theme-color meta 改写为当前生效的颜色：Android 安装后的 PWA
// 取第一条 meta 且不理会 media 查询，所以不能依赖 media 自动切换。
// 手动 light/dark 直接覆盖；system 模式监听系统深浅色变化实时更新。
function useThemeColorSync(mode: ThemeMode) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && mq.matches);
      const color = dark ? THEME_COLORS.dark : THEME_COLORS.light;
      for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        meta.setAttribute('content', color);
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
}

const ThemeModeContext = createContext<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}>({mode: 'system', setMode: () => {}});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export function Providers({
  initialMode,
  children,
}: {
  initialMode: ThemeMode;
  children: React.ReactNode;
}) {
  const [mode, setModeState] = useState<ThemeMode>(initialMode);
  useThemeColorSync(mode);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    // persist so the server can render the right data-theme on first paint
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const value = useMemo(() => ({mode, setMode}), [mode, setMode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <InternationalizationProvider locale="zh-CN" messages={{'zh-CN': zhCN}}>
        <LinkProvider component={NextLink}>
          <Theme theme={myWorldTheme} mode={mode}>
            {children}
          </Theme>
        </LinkProvider>
      </InternationalizationProvider>
    </ThemeModeContext.Provider>
  );
}
