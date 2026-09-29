import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORY_NAMES } from './config/taxonomy';
import { parseSiteDate } from './utils/date';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const siteDate = z.unknown().transform((value, ctx) => {
  const date = parseSiteDate(value);
  if (!date) {
    ctx.addIssue({
      code: 'custom',
      message: '日期格式須為 YYYY-MM-DD，或帶時區的 YYYY-MM-DDTHH:mm+08:00',
    });
    return z.NEVER;
  }
  return date;
});

const blog = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/blog',
    // URL 以 Frontmatter 的 slug 為準；未指定時使用檔名（不含 tech/、life/ 資料夾），
    // 因此在資料夾間搬移文章不會改變網址。
    generateId: ({ entry, data }) =>
      typeof data.slug === 'string' && data.slug
        ? data.slug
        : entry.replace(/\.md$/, '').split('/').pop()!,
  }),
  schema: ({ image }) =>
    z
      .strictObject({
        title: z.string().min(1),
        slug: z.string().regex(SLUG_PATTERN, 'slug 只能使用小寫英文、數字與連字號').optional(),
        description: z.string().min(1),
        category: z.enum(CATEGORY_NAMES),
        tags: z.array(z.string().min(1)).default([]),
        publishedAt: siteDate,
        updatedAt: siteDate.optional(),
        draft: z.boolean().default(false),
        cover: image().optional(),
        coverAlt: z.string().optional(),
        seo: z
          .strictObject({
            title: z.string().optional(),
            description: z.string().optional(),
          })
          .optional(),
      })
      .refine((d) => !d.cover || !!d.coverAlt, {
        message: '設定 cover 時必須提供 coverAlt（圖片替代文字）',
        path: ['coverAlt'],
      })
      .refine((d) => !d.updatedAt || d.updatedAt >= d.publishedAt, {
        message: 'updatedAt 不可早於 publishedAt',
        path: ['updatedAt'],
      }),
});

export const collections = { blog };
