// 判斷規則的單元測試；外掛在實際 Markdown 上的效果由 scripts/verify-build.mjs 檢查。
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isSafeHtml, isSafeUrl } from '../src/plugins/safe-html.mjs';

test('允許不帶屬性的安全標籤與註解', () => {
  assert.equal(isSafeHtml('<details>\n<summary>更多</summary>'), true);
  assert.equal(isSafeHtml('<kbd>Ctrl</kbd> + <kbd>C</kbd>'), true);
  assert.equal(isSafeHtml('<br/>'), true);
  assert.equal(isSafeHtml('<!-- 備註 -->'), true);
});

test('拒絕危險標籤與任何屬性', () => {
  assert.equal(isSafeHtml('<script>alert(1)</script>'), false);
  assert.equal(isSafeHtml('<img src=x onerror=alert(1)>'), false);
  assert.equal(isSafeHtml('<iframe src="https://example.com"></iframe>'), false);
  assert.equal(isSafeHtml('<details open>'), false);
  assert.equal(isSafeHtml('<mark style="color:red">x</mark>'), false);
  assert.equal(isSafeHtml('<!-- x --><script>'), false);
});

test('網址協定白名單', () => {
  for (const url of ['https://redis.io', 'http://a.b', 'mailto:a@b.c', 'tel:123', '/blog/x/', '../img.png', '#top', '?q=1']) {
    assert.equal(isSafeUrl(url), true, url);
  }
  for (const url of ['javascript:alert(1)', 'JavaScript:alert(1)', ' javascript:x', 'java\nscript:x', 'java\tscript:x', 'data:text/html,<script>', 'vbscript:x']) {
    assert.equal(isSafeUrl(url), false, JSON.stringify(url));
  }
});
