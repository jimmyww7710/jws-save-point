import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES, getCategory, tagSlug, type Category, type CategoryGroup } from '../config/taxonomy';

export type Post = CollectionEntry<'blog'>;

/**
 * 取得可公開的文章（依發布日期新到舊）。
 * 草稿只在 `npm run dev` 時出現以便預覽；正式建置一律排除，
 * 因此不會產生頁面，也不會進入 Sitemap 與搜尋索引。
 */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('blog', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}

export const postUrl = (post: Post) => `/blog/${post.id}/`;
export const categoryUrl = (category: Category) => `/categories/${category.slug}/`;
export const tagUrl = (slug: string) => `/tags/${slug}/`;
export const groupUrl = (group: CategoryGroup) => `/${group}/`;
export const blogPageUrl = (page: number) => (page === 1 ? '/blog/' : `/blog/page/${page}/`);

export const groupOf = (post: Post): CategoryGroup => getCategory(post.data.category).group;

export interface TagSummary {
  name: string;
  slug: string;
  count: number;
}

export const toTagLinks = (names: string[]) => names.map((name) => ({ name, slug: tagSlug(name) }));

/** 彙整所有標籤與文章數。不同寫法對應到相同 slug 時直接中止建置，避免網址衝突。 */
export function collectTags(posts: Post[]): TagSummary[] {
  const bySlug = new Map<string, TagSummary>();
  for (const post of posts) {
    for (const name of post.data.tags) {
      const slug = tagSlug(name);
      if (!slug) throw new Error(`標籤「${name}」無法產生網址（文章：${post.id}）`);
      const existing = bySlug.get(slug);
      if (existing && existing.name !== name) {
        throw new Error(`標籤「${name}」與「${existing.name}」對應到相同網址 /tags/${slug}/，請統一寫法（文章：${post.id}）`);
      }
      bySlug.set(slug, { name, slug, count: (existing?.count ?? 0) + 1 });
    }
  }
  return [...bySlug.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export interface CategorySummary {
  category: Category;
  count: number;
}

/** 所有已定義分類與文章數（含 0 篇的分類），可依群組篩選。 */
export function collectCategories(posts: Post[], group?: CategoryGroup): CategorySummary[] {
  return CATEGORIES.filter((c) => !group || c.group === group).map((category) => ({
    category,
    count: posts.filter((p) => p.data.category === category.name).length,
  }));
}

/** 依發布日期取得較新與較舊的相鄰文章（posts 需為 getPublishedPosts() 的排序）。 */
export function getAdjacentPosts(posts: Post[], post: Post): { newer?: Post; older?: Post } {
  const i = posts.findIndex((p) => p.id === post.id);
  return { newer: posts[i - 1], older: posts[i + 1] };
}

/** 相關文章：每個共同標籤 2 分、同分類 1 分，分數相同時較新的優先；沒有關聯則不列出。 */
export function getRelatedPosts(posts: Post[], post: Post, limit = 3): Post[] {
  const tags = new Set(post.data.tags.map(tagSlug));
  return posts
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      post: p,
      score:
        p.data.tags.filter((t) => tags.has(tagSlug(t))).length * 2 + (p.data.category === post.data.category ? 1 : 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.post.data.publishedAt.getTime() - a.post.data.publishedAt.getTime())
    .slice(0, limit)
    .map((r) => r.post);
}

/** 切分頁；至少回傳一頁（空陣列），讓列表頁可以顯示「尚無文章」。 */
export function paginate<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
}
