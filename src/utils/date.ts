import { SITE } from '../config/site';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * 將 Frontmatter 日期正規化為 Date。
 * - "2026-09-29"：視為網站時區（SITE.timezone）當天午夜。
 * - "2026-09-29T21:30+08:00"：必須帶時區偏移，避免被建置機器的時區解讀。
 * - YAML 未加引號的日期會被解析成 UTC 午夜的 Date，同樣視為網站時區當天。
 * 回傳 undefined 代表格式不合法，交由 Schema 回報錯誤。
 */
export function parseSiteDate(value: unknown): Date | undefined {
  let text: string;
  if (value instanceof Date) {
    const iso = value.toISOString();
    text = iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
  } else if (typeof value === 'string') {
    text = value.trim();
  } else {
    return undefined;
  }

  if (DATE_ONLY.test(text)) text = `${text}T00:00:00${SITE.utcOffset}`;
  else if (!DATE_TIME_WITH_OFFSET.test(text)) return undefined;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SITE.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 以網站時區輸出 YYYY-MM-DD，用於顯示與 <time datetime>。 */
export function formatDate(date: Date): string {
  return isoDateFormatter.format(date);
}
