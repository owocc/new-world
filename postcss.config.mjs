const config = {
  plugins: {
    '@stylexjs/postcss-plugin': {
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      useCSSLayers: true,
    },
  },
};

export default config;
