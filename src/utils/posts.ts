import { getCollection, type CollectionEntry } from 'astro:content';
import { getCategory, tagSlug } from '../config/taxonomy';

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

export function postUrl(post: Post): string {
  return `/blog/${post.id}/`;
}

export function categoryUrl(post: Post): string {
  return `/categories/${getCategory(post.data.category).slug}/`;
}

export interface TagSummary {
  name: string;
  slug: string;
  count: number;
}

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
