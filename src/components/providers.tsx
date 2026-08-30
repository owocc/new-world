'use client';

import {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {Theme} from '@astryxdesign/core';
import {LinkProvider} from '@astryxdesign/core/Link';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import NextLink from 'next/link';
import zhCN from '@astryxdesign/core/locales/zh-CN.json';
import {myWorldTheme} from '@/theme/my-world.js';
import {useThemeColorSync} from '@/lib/theme-color-client';
import '@/theme/my-world.css';

export type ThemeMode = 'light' | 'dark' | 'system';

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
