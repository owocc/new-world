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

const THEME_COLORS = {light: '#faf9f7', dark: '#141210'} as const;

// 根据当前主题模式改写 theme-color meta，使 PWA/浏览器状态栏颜色跟随深浅色。
// 手动指定 light/dark 时把两条 media meta 改为同一颜色以覆盖系统偏好；
// system 模式下保持各自颜色，由 media 查询自行切换，无需监听系统变化。
function useThemeColorSync(mode: ThemeMode) {
  useEffect(() => {
    if (mode === 'system') return;
    const color = THEME_COLORS[mode];
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      meta.setAttribute('content', color);
    }
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
