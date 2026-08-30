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
