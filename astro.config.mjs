// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { SITE } from './src/config/site.ts';
import { safeHtml } from './src/plugins/safe-html.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE.url,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    // Sätteri 是 Astro 7 預設的 Markdown 處理器；這裡只加上 HTML 安全外掛。
    processor: satteri({ mdastPlugins: [safeHtml] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
    },
  },
});
