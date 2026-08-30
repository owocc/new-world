import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  headers: async () => [
    {
      // manifest 动态读取主题 cookie/系统深浅色，禁止缓存，
      // 否则已安装的 PWA 会一直使用安装时的旧状态栏颜色
      source: '/manifest.webmanifest',
      headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
    },
    {
      // 让服务端在 manifest/SSR 中感知系统深浅色（theme=system 时状态栏颜色才能跟随系统）
      source: '/:path*',
      headers: [
        { key: 'Accept-CH', value: 'Sec-CH-Prefers-Color-Scheme' },
        { key: 'Critical-CH', value: 'Sec-CH-Prefers-Color-Scheme' },
      ],
    },
  ],
};

export default nextConfig;
