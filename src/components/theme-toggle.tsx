'use client';

import {Moon, Sun} from 'lucide-react';
import {IconButton} from '@astryxdesign/core/IconButton';
import {useThemeMode} from '@/components/providers';

/**
 * ThemeToggle：主题切换的极简示例组件，用于验证主题链路
 * （html[data-theme] → localStorage/cookie 持久化 → meta theme-color 状态栏同步）。
 * 点击在浅色 / 深色间切换；深色显示太阳、浅色显示月亮。
 */
export function ThemeToggle() {
  const {theme, toggleTheme} = useThemeMode();
  const isDark = theme === 'dark';

  return (
    <IconButton
      label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      variant="ghost"
      icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
      onClick={toggleTheme}
    />
  );
}
