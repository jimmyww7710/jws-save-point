/**
 * 分類的唯一定義處。文章 Frontmatter 的 category 必須是這裡的 name，
 * Schema 會在建置時驗證；新增分類只需在此加一筆。
 * 標籤則由文章自由指定，不需要在這裡登記。
 */
export const CATEGORY_GROUPS = {
  tech: { label: '技術文章', description: '前後端開發、資料庫、DevOps、架構與除錯筆記。' },
  life: { label: '生活文章', description: '日常、閱讀、旅行與自我成長的紀錄。' },
} as const;

export type CategoryGroup = keyof typeof CATEGORY_GROUPS;

export const CATEGORIES = [
  { name: 'Frontend', slug: 'frontend', group: 'tech' },
  { name: 'Backend', slug: 'backend', group: 'tech' },
  { name: 'Database', slug: 'database', group: 'tech' },
  { name: 'DevOps', slug: 'devops', group: 'tech' },
  { name: 'Architecture', slug: 'architecture', group: 'tech' },
  { name: 'Debugging', slug: 'debugging', group: 'tech' },
  { name: 'Daily', slug: 'daily', group: 'life' },
  { name: 'Reading', slug: 'reading', group: 'life' },
  { name: 'Travel', slug: 'travel', group: 'life' },
  { name: 'Reflection', slug: 'reflection', group: 'life' },
  { name: 'Growth', slug: 'growth', group: 'life' },
] as const satisfies ReadonlyArray<{ name: string; slug: string; group: CategoryGroup }>;

export type CategoryName = (typeof CATEGORIES)[number]['name'];
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name) as [CategoryName, ...CategoryName[]];

export function getCategory(name: CategoryName): Category {
  const category = CATEGORIES.find((c) => c.name === name);
  if (!category) throw new Error(`Unknown category: ${name}`);
  return category;
}

/**
 * 標籤名稱 → URL slug：轉小寫、空白轉連字號，保留中英文與數字。
 * 例：「TypeScript」→ typescript、「Node.js」→ node-js、「閱讀 筆記」→ 閱讀-筆記
 */
export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}
