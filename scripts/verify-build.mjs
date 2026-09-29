// 建置後檢查：讀取 src/content/blog 的原始 Markdown，逐項比對 dist/ 輸出。
// 用法：npm run build && npm run verify
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, basename, sep } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const CONTENT = join(ROOT, 'src', 'content', 'blog');

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? '✔' : '✘'} ${message}`);
  if (!ok) failures.push(message);
};

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// 與 src/config/taxonomy.ts 的 tagSlug() 相同規則（此腳本以純 Node 執行，無法直接匯入 TS）。
const tagSlug = (tag) =>
  tag.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

// 簡易 Frontmatter 讀取：只取本檢查需要的欄位。
function readMeta(file) {
  const fm = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const field = (key) => fm.match(new RegExp(`^${key}:\\s*"?([^"\\r\\n]+)"?`, 'm'))?.[1]?.trim();
  const inlineTags = fm.match(/^tags:\s*\[(.*)\]/m)?.[1];
  const blockTags = fm.match(/^tags:\s*\r?\n((?:\s+-\s+.+\r?\n?)+)/m)?.[1];
  const tags = inlineTags
    ? inlineTags.split(',')
    : (blockTags?.split(/\r?\n/).map((line) => line.replace(/^\s+-\s+/, '')) ?? []);
  return {
    file: relative(ROOT, file).split(sep).join('/'),
    slug: field('slug') ?? basename(file, '.md'),
    draft: field('draft') === 'true',
    publishedAt: field('publishedAt')?.slice(0, 10),
    tags: tags.map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean),
  };
}

/** 將站內網址對應到 dist 內的檔案。 */
function distPathFor(href) {
  const path = decodeURIComponent(href.split(/[?#]/)[0]);
  return path.endsWith('/') ? join(DIST, path, 'index.html') : join(DIST, path);
}

if (!existsSync(DIST)) {
  console.error('找不到 dist/，請先執行 npm run build');
  process.exit(1);
}

const posts = walk(CONTENT).filter((f) => f.endsWith('.md')).map(readMeta);
const published = posts.filter((p) => !p.draft);
const drafts = posts.filter((p) => p.draft);
const distFiles = walk(DIST);
const textFiles = distFiles.filter((f) => /\.(html|xml|json|txt)$/.test(f));

const slugs = posts.map((p) => p.slug);
check(new Set(slugs).size === slugs.length, `文章 slug 不重複（${slugs.length} 篇）`);

for (const post of published) {
  const page = join(DIST, 'blog', post.slug, 'index.html');
  check(existsSync(page), `已發布文章有頁面：/blog/${post.slug}/`);
  if (existsSync(page) && post.publishedAt) {
    check(
      readFileSync(page, 'utf8').includes(`datetime="${post.publishedAt}"`),
      `日期未偏移：/blog/${post.slug}/ 顯示 ${post.publishedAt}`,
    );
  }
}

for (const draft of drafts) {
  check(!existsSync(join(DIST, 'blog', draft.slug)), `草稿沒有頁面：${draft.file}`);
  const leaked = textFiles.filter((f) => readFileSync(f, 'utf8').includes(`/blog/${draft.slug}/`));
  check(leaked.length === 0, `草稿網址未出現在任何輸出檔（含 Sitemap）：${draft.slug}`);
}
const sentinelLeaks = textFiles.filter((f) => readFileSync(f, 'utf8').includes('DRAFT_SENTINEL_TEXT'));
check(sentinelLeaks.length === 0, '草稿內文未出現在任何輸出檔');

const sitemapFiles = distFiles.filter((f) => /sitemap-\d+\.xml$/.test(f));
check(sitemapFiles.length > 0, 'Sitemap 已產生');
const sitemap = sitemapFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
for (const post of published) {
  check(sitemap.includes(`/blog/${post.slug}/`), `Sitemap 收錄 /blog/${post.slug}/`);
}

check(!sitemap.includes('/404'), 'Sitemap 未收錄 404 頁');

// 固定頁面
for (const page of ['/', '/blog/', '/categories/', '/tags/', '/about/', '/tech/', '/life/', '/404.html']) {
  check(existsSync(distPathFor(page)), `頁面存在：${page}`);
}

// 分類頁：taxonomy.ts 中每個分類都要有頁面
const taxonomy = readFileSync(join(ROOT, 'src', 'config', 'taxonomy.ts'), 'utf8');
const categorySlugs = [...taxonomy.matchAll(/slug: '([^']+)'/g)].map((m) => m[1]);
check(categorySlugs.length > 0, `讀取到 ${categorySlugs.length} 個分類`);
for (const slug of categorySlugs) {
  check(existsSync(distPathFor(`/categories/${slug}/`)), `分類頁存在：/categories/${slug}/`);
}

// 標籤頁：已發布文章的標籤都有頁面；只出現在草稿的標籤不可有頁面
const publishedTags = new Set(published.flatMap((p) => p.tags.map(tagSlug)));
for (const slug of publishedTags) {
  check(existsSync(distPathFor(`/tags/${slug}/`)), `標籤頁存在：/tags/${slug}/`);
}
for (const slug of new Set(drafts.flatMap((p) => p.tags.map(tagSlug)))) {
  if (!publishedTags.has(slug)) check(!existsSync(join(DIST, 'tags', slug)), `草稿專屬標籤沒有頁面：/tags/${slug}/`);
}

// 每個 HTML 頁面：SEO 基本標籤，以及所有站內連結都能對應到實際檔案
const htmlFiles = distFiles.filter((f) => f.endsWith('.html'));
const brokenLinks = [];
const missingSeo = [];
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const name = relative(DIST, file).split(sep).join('/');
  const is404 = name === '404.html';
  const hasSeo =
    /<title>[^<]+<\/title>/.test(html) &&
    /<meta name="description" content="[^"]+"/.test(html) &&
    /<meta property="og:image" content="https?:\/\//.test(html) &&
    (is404 || /<link rel="canonical" href="https?:\/\//.test(html));
  if (!hasSeo) missingSeo.push(name);
  for (const [, href] of html.matchAll(/\shref="(\/(?!\/)[^"]*)"/g)) {
    if (!existsSync(distPathFor(href))) brokenLinks.push(`${name} → ${href}`);
  }
}
check(missingSeo.length === 0, `所有 ${htmlFiles.length} 個頁面都有 title / description / og:image / canonical${missingSeo.length ? `（缺少：${missingSeo.join(', ')}）` : ''}`);
check(brokenLinks.length === 0, `站內連結全部有效${brokenLinks.length ? `（失效：\n  ${brokenLinks.join('\n  ')}）` : ''}`);

const robots = join(DIST, 'robots.txt');
check(existsSync(robots) && /Sitemap: https?:\/\/.+sitemap-index\.xml/.test(readFileSync(robots, 'utf8')), 'robots.txt 指向 Sitemap');

console.log(failures.length ? `\n${failures.length} 項檢查失敗` : '\n全部檢查通過');
process.exit(failures.length ? 1 : 0);
