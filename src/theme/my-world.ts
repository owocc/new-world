import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

/**
 * 我的世界 theme — derived from Astryx Neutral.
 * Warm, quiet neutrals with a terracotta accent: a private social app,
 * not an AI product. No purple, no glow.
 */
export const myWorldTheme = defineTheme({
  name: 'my-world',
  extends: neutralTheme,
  color: {
    // [light, dark] tuple seeds each scheme's derived palette
    accent: ['#B5531F', '#E8935A'],
    neutralStyle: 'neutral',
  },
  typography: {
    scale: {base: 15, ratio: 1.2},
    body: {
      family: 'system-ui',
      fallbacks:
        "-apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
    },
    code: {
      family: 'ui-monospace',
      fallbacks: "SFMono-Regular, Menlo, 'PingFang SC', monospace",
    },
  },
});
