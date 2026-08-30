import type {MetadataRoute} from 'next';
import {cookies} from 'next/headers';

// Android 安装后的 PWA 状态栏颜色取自 manifest 的 theme_color，
// 这里按用户的主题 cookie 动态输出，避免深色模式下状态栏仍是浅色。
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const theme = (await cookies()).get('theme')?.value;
  const theme_color = theme === 'dark' ? '#141210' : '#faf9f7';

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
    theme_color,
    background_color: '#141210',
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
