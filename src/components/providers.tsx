'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {Theme} from '@astryxdesign/core';
import {LinkProvider} from '@astryxdesign/core/Link';
import {InternationalizationProvider} from '@astryxdesign/core/i18n';
import NextLink from 'next/link';
import zhCN from '@astryxdesign/core/locales/zh-CN.json';
import {myWorldTheme} from '@/theme/my-world.js';
import {ThemeColorSync} from '@/lib/theme-color-client';
import '@/theme/my-world.css';

export type ThemeMode = 'light' | 'dark' | 'system';
/** 实际生效的主题（mode 为 system 时按系统深浅色解析） */
export type EffectiveTheme = 'light' | 'dark';

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const ThemeModeContext = createContext<{
  mode: ThemeMode;
  theme: EffectiveTheme | null;
  setMode: (mode: ThemeMode) => void;
  setTheme: (theme: EffectiveTheme) => void;
  toggleTheme: () => void;
}>({mode: 'system', theme: null, setMode: () => {}, setTheme: () => {}, toggleTheme: () => {}});

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
  // system 模式下服务端无法得知系统深浅色，挂载后才有值；
  // 初始为 null 与 SSR 保持一致，避免 hydration mismatch
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemPrefersDark(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const theme: EffectiveTheme | null =
    mode === 'system' ? (systemPrefersDark === null ? null : systemPrefersDark ? 'dark' : 'light') : mode;

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    // persist so the server can render the right data-theme on first paint
    document.cookie = `theme=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
    // localStorage 同步持久化：cookie 丢失时首帧前的初始化脚本仍能恢复用户选择
    try {
      if (next === 'system') {
        localStorage.removeItem('theme');
      } else {
        localStorage.setItem('theme', next);
      }
    } catch {
      // 隐私模式等场景 localStorage 不可用时忽略，cookie 仍然生效
    }
    // 立即同步 <html data-theme>；Theme 根组件随后也会同步同样的值。
    // system 模式移除属性，交还 light-dark() 跟随系统。
    if (next === 'light' || next === 'dark') {
      document.documentElement.dataset.theme = next;
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, []);

  const setTheme = useCallback(
    (next: EffectiveTheme) => {
      setMode(next);
    },
    [setMode],
  );

  const toggleTheme = useCallback(() => {
    // 以当前实际生效主题为准取反（system 模式按系统深浅色解析）
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current: EffectiveTheme = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;
    setMode(current === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo(
    () => ({mode, theme, setMode, setTheme, toggleTheme}),
    [mode, theme, setMode, setTheme, toggleTheme],
  );

  // 兜底：cookie 丢失但 localStorage 仍保留显式选择时（如清 Cookie 后刷新），
  // 挂载后采纳 localStorage，避免回落到 system 造成视觉跳变
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if ((stored === 'light' || stored === 'dark') && stored !== mode) {
        setModeState(stored);
        document.cookie = `theme=${stored}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
      }
    } catch {
      // localStorage 不可用时忽略
    }
    // 仅挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeModeContext.Provider value={value}>
      <InternationalizationProvider locale="zh-CN" messages={{'zh-CN': zhCN}}>
        <LinkProvider component={NextLink}>
          <ThemeColorSync mode={mode} />
          <Theme theme={myWorldTheme} mode={mode}>
            {children}
          </Theme>
        </LinkProvider>
      </InternationalizationProvider>
    </ThemeModeContext.Provider>
  );
}
