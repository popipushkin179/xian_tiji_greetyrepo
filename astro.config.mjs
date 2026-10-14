import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://popipushkin179.github.io',
  base: '/xian_tiji_greetyrepo',
  output: 'static',
  trailingSlash: 'always',
  fonts: [
    {
      name: 'Zen Maru Gothic',
      cssVariable: '--font-body',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-rounded', 'system-ui', 'sans-serif'],
    },
    {
      name: 'Klee One',
      cssVariable: '--font-hand',
      provider: fontProviders.fontsource(),
      weights: [400, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['Bradley Hand', 'cursive'],
    },
  ],
});
