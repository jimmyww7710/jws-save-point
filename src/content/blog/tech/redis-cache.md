---
title: "Redis Cache 筆記：快取策略與常見陷阱"
slug: "redis-cache"
description: "整理 Redis 快取的設計方式與實務經驗，包含 Cache-Aside、過期策略，以及快取雪崩、穿透與擊穿的處理。"
category: "Backend"
tags:
  - Redis
  - Cache
  - Node.js
publishedAt: "2026-09-20"
updatedAt: "2026-09-25"
cover: "../../../assets/covers/redis-cache.webp"
coverAlt: "紅色漸層抽象背景"
---

快取是提升讀取效能最直接的手段，但它同時也引入了**資料一致性**的問題。這篇筆記整理我在專案中使用 Redis 的做法。

## 快取策略

### Cache-Aside（旁路快取）

最常見的模式：應用程式先讀快取，沒有命中時再讀資料庫並回填。

```ts
async function getUser(id: string): Promise<User> {
  const key = `user:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const user = await db.user.findUnique({ where: { id } });
  await redis.set(key, JSON.stringify(user), { EX: 60 * 10 });
  return user;
}
```

寫入時的順序建議是**先更新資料庫，再刪除快取**，而不是更新快取。

### 其他模式比較

| 模式 | 讀取 | 寫入 | 適用情境 |
| --- | --- | --- | --- |
| Cache-Aside | 應用程式負責 | 更新 DB 後刪快取 | 一般讀多寫少 |
| Read-Through | 快取層負責 | 同上 | 有快取中介層 |
| Write-Behind | 快取層負責 | 先寫快取、非同步寫 DB | 寫入量大、可容忍延遲 |

## 三大常見問題

1. **快取雪崩**：大量 key 同時過期。解法是在 TTL 加上隨機值。
2. **快取穿透**：查詢不存在的資料。解法是快取空值或使用 Bloom Filter。
3. **快取擊穿**：熱點 key 過期瞬間湧入大量請求。解法是互斥鎖或邏輯過期。

> 快取的 TTL 不是越長越好，要依資料的「可容忍過期時間」決定。

## 參考資料

- Redis 官方文件：<https://redis.io/docs/latest/develop/use/client-side-caching/>
