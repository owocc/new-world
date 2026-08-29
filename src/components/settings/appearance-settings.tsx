'use client';

import { useTheme } from '@/components/theme-toggle';

export function AppearanceSettings() {
  const { theme, toggle } = useTheme();
  return (
    <div className="rounded-3xl border border-line surface p-4 shadow-sm sm:p-5">
      <h2 className="mb-1 text-base font-bold">外观</h2>
      <p className="mb-4 text-xs text-muted">选择浅色或深色模式。未设置时跟随系统。</p>
      <div className="grid grid-cols-2 gap-3 sm:max-w-xs">
        <button
          onClick={() => {
            if (theme !== 'light') toggle();
          }}
          className={`rounded-2xl border-2 p-4 text-center transition-all ${
            theme === 'light'
              ? 'border-[var(--color-accent-500)]'
              : 'border-line surface-2'
          }`}
        >
          <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-gradient-to-br from-amber-100 to-white shadow-inner" />
          <span className="text-sm font-medium">浅色</span>
        </button>
        <button
          onClick={() => {
            if (theme !== 'dark') toggle();
          }}
          className={`rounded-2xl border-2 p-4 text-center transition-all ${
            theme === 'dark' ? 'border-[var(--color-accent-500)]' : 'border-line surface-2'
          }`}
        >
          <div className="mx-auto mb-2 h-14 w-14 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-inner" />
          <span className="text-sm font-medium">深色</span>
        </button>
      </div>
    </div>
  );
}
