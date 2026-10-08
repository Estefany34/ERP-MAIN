import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from './app.js';

const configured = ['https://erp-fanixglobal.pages.dev'];

test('CORS accepts production and Fanix Cloudflare Pages previews', () => {
  assert.equal(isAllowedOrigin('https://erp-fanixglobal.pages.dev', configured), true);
  assert.equal(isAllowedOrigin('https://82ded215.erp-fanixglobal.pages.dev', configured), true);
  assert.equal(isAllowedOrigin('https://future-preview.erp-fanixglobal.pages.dev', configured), true);
});

test('CORS rejects insecure, lookalike and unrelated origins', () => {
  assert.equal(isAllowedOrigin('http://82ded215.erp-fanixglobal.pages.dev', configured), false);
  assert.equal(isAllowedOrigin('https://erp-fanixglobal.pages.dev.evil.example', configured), false);
  assert.equal(isAllowedOrigin('https://evil-erp-fanixglobal.pages.dev', configured), false);
  assert.equal(isAllowedOrigin('https://example.com', configured), false);
  assert.equal(isAllowedOrigin('not-a-url', configured), false);
});
