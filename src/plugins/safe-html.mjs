/**
 * Sätteri mdast 外掛：限制 Markdown 中的原生 HTML 與連結網址，避免文章渲染產生 XSS。
 * （Astro 7 預設的 Markdown 處理器 Sätteri 會原樣輸出原生 HTML，因此需要這道處理。）
 *
 * - 原生 HTML 只允許「不帶任何屬性」的安全標籤（見 ALLOWED_TAGS）與 HTML 註解；
 *   其他內容（<script>、<iframe>、帶 onclick/style 等屬性的標籤）一律轉為純文字顯示。
 * - 連結、圖片與參考定義的網址只允許 http、https、mailto、tel 與相對路徑，其餘改為 "#"。
 * 被處理的內容會在建置時輸出警告，方便作者修正。
 *
 * 以純 JavaScript 撰寫，讓 node:test 可以直接測試判斷規則。
 */

const ALLOWED_TAGS = ['details', 'summary', 'kbd', 'sub', 'sup', 'mark', 'br', 'abbr', 'ins', 'del', 'small'];
const ALLOWED_TAG = new RegExp(`<\\/?(?:${ALLOWED_TAGS.join('|')})\\s*\\/?>`, 'gi');
const COMMENT = /<!--[\s\S]*?-->/g;
const SAFE_PROTOCOLS = new Set(['http', 'https', 'mailto', 'tel']);

/** @param {string} html */
export function isSafeHtml(html) {
  return !html.replace(COMMENT, '').replace(ALLOWED_TAG, '').includes('<');
}

/** @param {string} url */
export function isSafeUrl(url) {
  // 移除瀏覽器解析時會忽略的空白與控制字元，避免 "java\nscript:" 之類的繞過。
  const normalized = url.replace(/[\u0000- \u007f-\u009f]/g, '');
  const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/i)?.[1];
  return !scheme || SAFE_PROTOCOLS.has(scheme.toLowerCase());
}

/**
 * @param {{ fileURL?: URL }} ctx
 * @param {string} message
 */
function warn(ctx, message) {
  console.warn(`[safe-html] ${ctx.fileURL?.pathname ?? ''}\n  ${message}`);
}

/**
 * @param {{ url: string }} node
 * @param {any} ctx
 */
function checkUrl(node, ctx) {
  if (!isSafeUrl(node.url)) {
    warn(ctx, `不允許的網址已改為 #：${node.url.slice(0, 80)}`);
    ctx.setProperty(node, 'url', '#');
  }
}

/** @type {import('satteri').MdastPluginDefinition} */
export const safeHtml = {
  name: 'jws-safe-html',
  html(node, ctx) {
    if (isSafeHtml(node.value)) {
      const cleaned = node.value.replace(COMMENT, '');
      if (cleaned !== node.value) ctx.setProperty(node, 'value', cleaned);
    } else {
      warn(ctx, `不允許的 HTML 已轉為純文字：${node.value.slice(0, 80)}`);
      ctx.replaceNode(node, { type: 'text', value: node.value });
    }
  },
  link: checkUrl,
  image: checkUrl,
  definition: checkUrl,
};
