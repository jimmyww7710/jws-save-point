import type { APIRoute } from 'astro';

// 由網站設定產生，避免在 public/robots.txt 硬編碼網址。
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap-index.xml', site)}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
