'use client';

import { useEffect, useState } from 'react';

function readTheme(): 'light' | 'dark' {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const apply = (next: 'light' | 'dark') => {
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    // persist for a year so the server can render the right theme on first paint
    document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  };

  return { theme, toggle: () => apply(theme === 'dark' ? 'light' : 'dark') };
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-secondary transition-colors hover:surface-2 ${className ?? ''}`}
      aria-label="切换主题"
      type="button"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
