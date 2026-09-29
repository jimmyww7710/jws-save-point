// 直接匯入 TypeScript 原始碼，需要 Node.js 22.18 以上（內建 type stripping）。
import assert from 'node:assert/strict';
import { test } from 'node:test';
import MiniSearch from 'minisearch';
import {
  MINISEARCH_OPTIONS,
  SEARCH_OPTIONS,
  markdownToText,
  tokenizeForIndex,
  tokenizeForQuery,
} from '../src/utils/search.ts';

test('中文產生單字與 bigram，英文轉小寫', () => {
  assert.deepEqual(tokenizeForIndex('Redis 快取'), ['redis', '快', '取', '快取']);
  assert.deepEqual(tokenizeForQuery('快取策略'), ['快取', '取策', '策略']);
  assert.deepEqual(tokenizeForQuery('快'), ['快']);
  assert.deepEqual(tokenizeForQuery('Docker網路'), ['docker', '網路']);
});

test('markdownToText 去除語法並保留文字與程式碼', () => {
  const text = markdownToText('# 標題\n\n**粗體** [連結](https://x.y) ![圖](a.png)\n\n```ts\nredis.get(key)\n```');
  assert.equal(text, '標題 粗體 連結 圖 redis.get(key)');
});

const docs = [
  { id: 'redis', title: 'Redis Cache 筆記', description: '快取策略', url: '/blog/redis/', category: 'Backend', tags: ['Redis'], date: '2026-09-20', text: '快取雪崩與穿透' },
  { id: 'docker', title: '搞懂 Docker Network', description: '容器網路', url: '/blog/docker/', category: 'DevOps', tags: ['Docker'], date: '2026-09-12', text: 'bridge host 自訂網路' },
  { id: 'travel', title: '台灣海景秘境', description: '看海放空', url: '/blog/travel/', category: 'Travel', tags: ['旅行'], date: '2026-09-05', text: '花蓮 石梯坪' },
];
const index = new MiniSearch(MINISEARCH_OPTIONS);
index.addAll(docs);
const ids = (q) => index.search(q, SEARCH_OPTIONS).map((r) => r.id);

test('中文、英文、混合、前綴、拼錯與標籤查詢', () => {
  assert.deepEqual(ids('快取'), ['redis']);
  assert.deepEqual(ids('快取策略'), ['redis']);
  assert.deepEqual(ids('網路'), ['docker']);
  assert.deepEqual(ids('石梯坪'), ['travel']);
  assert.deepEqual(ids('海'), ['travel']);
  assert.deepEqual(ids('dock'), ['docker']);
  assert.deepEqual(ids('netwrk'), ['docker']);
  assert.deepEqual(ids('Redis 雪崩'), ['redis']);
  assert.deepEqual(ids('旅行'), ['travel']);
  assert.deepEqual(ids('devops'), ['docker']);
});

test('搜尋結果保留顯示所需欄位的原始型別', () => {
  const [result] = index.search('Redis', SEARCH_OPTIONS);
  assert.equal(result.title, 'Redis Cache 筆記');
  assert.equal(result.url, '/blog/redis/');
  assert.deepEqual(result.tags, ['Redis']);
  assert.equal(result.date, '2026-09-20');
});

test('多個關鍵字以 AND 結合；無結果時回傳空陣列', () => {
  assert.deepEqual(ids('Redis Docker'), []);
  assert.deepEqual(ids('量子力學'), []);
  // 字都出現過，但順序不同的 bigram（略快）不存在，因此不會誤判命中。
  assert.deepEqual(ids('策略快'), []);
});
