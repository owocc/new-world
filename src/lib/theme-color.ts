import { cookies, headers } from 'next/headers';

// 必须与应用真实表面色一致（src/theme/my-world.js 的 --color-background-surface）：
// Android PWA 的状态栏色带由 theme_color 填充，颜色与页面顶部背景稍有偏差
// 就会在状态栏下出现一条色差"分割线"。
export const THEME_COLOR = {light: '#FFFBF8', dark: '#1F1B18'} as const;

export type EffectiveTheme = 'light' | 'dark';

/**
 * 解析当前生效的深浅色：
 * 1. 主题 cookie（用户在应用内手动选择）
 * 2. system / 未设置时，读取 Chrome 客户端提示 Sec-CH-Prefers-Color-Scheme
 *    （需配合 next.config.ts 的 Accept-CH / Critical-CH 响应头），
 *    让"跟随系统"的用户在服务端渲染（含 manifest theme_color）时也能得到正确的状态栏颜色。
 */
export async function getEffectiveTheme(): Promise<EffectiveTheme> {
  const mode = (await cookies()).get('theme')?.value;
  if (mode === 'dark' || mode === 'light') return mode;
  const hint = (await headers()).get('sec-ch-prefers-color-scheme');
  return hint === 'dark' ? 'dark' : 'light';
}
