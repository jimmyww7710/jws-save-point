import type { APIRoute } from 'astro';
import { formatDate } from '../utils/date';
import { getPublishedPosts, postUrl } from '../utils/posts';
import { markdownToText, type SearchDoc } from '../utils/search';

// 建置時產生的搜尋索引，只包含 getPublishedPosts() 回傳的文章（正式建置不含草稿）。
export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const docs: SearchDoc[] = posts.map((post) => ({
    id: post.id,
    title: post.data.title,
    description: post.data.description,
    url: postUrl(post),
    category: post.data.category,
    tags: post.data.tags,
    date: formatDate(post.data.publishedAt),
    text: markdownToText(post.body ?? ''),
  }));
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
