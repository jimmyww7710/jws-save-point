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

// 簡易 Frontmatter 讀取：只取本檢查需要的 slug / draft / publishedAt。
function readMeta(file) {
  const fm = readFileSync(file, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
  const field = (key) => fm.match(new RegExp(`^${key}:\\s*"?([^"\\r\\n]+)"?`, 'm'))?.[1]?.trim();
  return {
    file: relative(ROOT, file).split(sep).join('/'),
    slug: field('slug') ?? basename(file, '.md'),
    draft: field('draft') === 'true',
    publishedAt: field('publishedAt')?.slice(0, 10),
  };
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

const robots = join(DIST, 'robots.txt');
check(existsSync(robots) && /Sitemap: https?:\/\/.+sitemap-index\.xml/.test(readFileSync(robots, 'utf8')), 'robots.txt 指向 Sitemap');

console.log(failures.length ? `\n${failures.length} 項檢查失敗` : '\n全部檢查通過');
process.exit(failures.length ? 1 : 0);
