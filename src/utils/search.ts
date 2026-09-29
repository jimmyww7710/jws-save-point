/**
 * 搜尋共用邏輯：建置時（search-index.json）與瀏覽器端（/search/）使用同一份斷詞規則。
 *
 * 中文沒有空白分詞，這裡採用不需字典的 n-gram 做法：
 * - 連續的中日韓文字同時產生「單字」與「相鄰兩字（bigram）」，例如「快取策略」→ 快、取、策、略、快取、取策、策略。
 * - 查詢時多字中文只取 bigram，並以 AND 結合，因此「快取策略」必須三組 bigram 都出現才算命中。
 * - 英文與數字以單字切分、轉小寫，支援前綴與少量拼字錯誤。
 * 限制：無法理解詞義（例如「快取」與「緩存」不會互相命中），對個人部落格的規模已足夠。
 */
import type { Options, SearchOptions } from 'minisearch';

export interface SearchDoc {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  date: string;
  text: string;
}

const CJK_CLASS = '[\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}\\p{Script=Hangul}]';
const CJK = new RegExp(CJK_CLASS, 'u');
// 中日韓文字一段、其他字母數字一段（排除中日韓文字，避免「Docker網路」被視為同一段）。
const TOKEN = new RegExp(`${CJK_CLASS}+|(?:(?!${CJK_CLASS})[\\p{L}\\p{N}])+`, 'gu');

function cjkGrams(run: string, includeUnigrams: boolean): string[] {
  const chars = [...run];
  if (chars.length === 1) return chars;
  const grams: string[] = includeUnigrams ? [...chars] : [];
  for (let i = 0; i < chars.length - 1; i++) grams.push(chars[i]! + chars[i + 1]!);
  return grams;
}

function tokenizeWith(text: string, includeUnigrams: boolean): string[] {
  const tokens: string[] = [];
  for (const [run] of text.toLowerCase().matchAll(TOKEN)) {
    if (CJK.test(run)) tokens.push(...cjkGrams(run, includeUnigrams));
    else tokens.push(run);
  }
  return tokens;
}

export const tokenizeForIndex = (text: string) => tokenizeWith(text, true);
export const tokenizeForQuery = (text: string) => tokenizeWith(text, false);

const isLatin = (term: string) => !CJK.test(term);

export const MINISEARCH_OPTIONS: Options<SearchDoc> = {
  fields: ['title', 'description', 'tagsText', 'category', 'text'],
  storeFields: ['title', 'description', 'url', 'category', 'tags', 'date'],
  // storeFields 也會經過 extractField，因此除了合成的 tagsText 之外都回傳原始值（tags 需保持陣列）。
  extractField: (doc, field) => (field === 'tagsText' ? doc.tags.join(' ') : doc[field as keyof SearchDoc]),
  tokenize: tokenizeForIndex,
  processTerm: (term) => term,
};

export const SEARCH_OPTIONS: SearchOptions = {
  tokenize: tokenizeForQuery,
  processTerm: (term) => term,
  combineWith: 'AND',
  boost: { title: 4, tagsText: 3, category: 2, description: 2 },
  prefix: (term, i, terms) => isLatin(term) && i === terms.length - 1,
  fuzzy: (term) => (isLatin(term) && term.length >= 5 ? 0.2 : false),
};

/** 將 Markdown 轉為純文字供搜尋使用（保留程式碼內容，去除語法符號）。 */
export function markdownToText(markdown: string, maxLength = 6000): string {
  return markdown
    .replace(/```[^\n]*\n/g, ' ')
    .replace(/```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
