# JW's Save Point

個人部落格：Astro + TypeScript + Markdown，靜態輸出（SSG），無資料庫、無後台。
文章（`src/content/blog/**/*.md`）是網站唯一的資料來源。

> 目前進度：Phase 1（專案初始化）。完整的發布流程與部署說明會在 Phase 4 補齊。

## 環境需求

- Node.js 22.12 以上（見 `.nvmrc`）

## 常用指令

```bash
npm install       # 安裝依賴
npm run dev       # 本機開發伺服器（http://localhost:4321），草稿也會顯示
npm run check     # 型別與內容 Schema 檢查
npm run build     # check + 建置到 dist/
npm run preview   # 預覽建置結果
npm test          # build + 建置後檢查（路由、草稿排除、Sitemap）
```

## 新增文章

在 `src/content/blog/tech/` 或 `src/content/blog/life/` 新增 `.md` 檔：

```yaml
---
title: "文章標題"
slug: "my-post"            # 選填；未填則使用檔名。網址為 /blog/my-post/
description: "文章摘要"
category: "Backend"        # 必須是 src/config/taxonomy.ts 中定義的分類
tags: [Redis, Database]    # 自由填寫
publishedAt: "2026-09-29"  # YYYY-MM-DD，以 Asia/Taipei 解讀
updatedAt: "2026-09-30"    # 選填
draft: false               # true 時只在 npm run dev 顯示
cover: "../../../assets/covers/my-post.webp"  # 選填，相對於文章檔案
coverAlt: "封面圖片說明"    # 有 cover 時必填
seo:                       # 選填，覆寫 <title> 與 meta description
  title: "..."
  description: "..."
---
```

Frontmatter 寫錯（未定義的分類、拼錯欄位名、日期格式錯誤、缺少 coverAlt）時，`npm run build` 會直接失敗並指出錯誤。

## 設定集中處

| 檔案 | 內容 |
| --- | --- |
| `src/config/site.ts` | 網站網址、名稱、描述、作者、社群連結、時區 |
| `src/config/taxonomy.ts` | 分類清單與 URL slug、標籤 slug 規則 |
| `src/content.config.ts` | 文章 Frontmatter Schema |

正式網址可用環境變數 `SITE_URL` 覆寫。
