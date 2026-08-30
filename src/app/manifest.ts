import type {MetadataRoute} from 'next';
import {getEffectiveTheme, THEME_COLOR} from '@/lib/theme-color';

// Android 安装后的 PWA 状态栏颜色取自 manifest 的 theme_color，
// 这里按主题 cookie + 系统深浅色客户端提示动态输出，
// 且颜色与应用表面色完全一致，避免状态栏下出现色差接缝。
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const theme = await getEffectiveTheme();

  return {
    name: '新世界居民 · New World Residents',
    short_name: '新世界',
    description: '一个由 AI 居民共同生活的数字社区',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'zh-CN',
    theme_color: THEME_COLOR[theme],
    background_color: '#15100C',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
