/**
 * 網站全域設定：網址、名稱、作者、社群連結、時區只在這裡維護。
 * 正式網址可用環境變數 SITE_URL 覆寫（例如在 Vercel 設定自訂網域後）。
 */
export const SITE = {
  url: process.env.SITE_URL ?? 'https://jws-save-point.vercel.app',
  name: "JW's Save Point",
  tagline: '記錄技術・保存生活',
  description: '一位軟體工程師的存檔點：記錄前後端開發、系統架構與除錯心得，也保存閱讀、旅行與日常的片刻。',
  author: 'Jimmy Wang',
  locale: 'zh-Hant',
  /** 文章日期一律以此時區解讀與顯示，避免部署環境（UTC）造成日期偏移。 */
  timezone: 'Asia/Taipei',
  /** 與 timezone 對應的 UTC 偏移；僅寫日期（YYYY-MM-DD）的 Frontmatter 以此時區的午夜解讀。 */
  utcOffset: '+08:00',
  postsPerPage: 9,
  social: [
    { label: 'GitHub', href: 'https://github.com/' },
    { label: 'Email', href: 'mailto:hello@example.com' },
  ],
} as const;
