import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from './app.js';

const configuredOrigins = ['https://erp-fanixglobal.pages.dev'];

test('CORS accepts the configured production origin', () => {
  assert.equal(isAllowedOrigin('https://erp-fanixglobal.pages.dev', configuredOrigins), true);
});

test('CORS accepts HTTPS Cloudflare Pages previews for Fanix only', () => {
  assert.equal(isAllowedOrigin('https://82ded215.erp-fanixglobal.pages.dev', configuredOrigins), true);
  assert.equal(isAllowedOrigin('https://preview-123.erp-fanixglobal.pages.dev', configuredOrigins), true);
});

test('CORS rejects lookalike, insecure and unrelated origins', () => {
  assert.equal(isAllowedOrigin('https://erp-fanixglobal.pages.dev.evil.example', configuredOrigins), false);
  assert.equal(isAllowedOrigin('https://evil-erp-fanixglobal.pages.dev', configuredOrigins), false);
  assert.equal(isAllowedOrigin('http://82ded215.erp-fanixglobal.pages.dev', configuredOrigins), false);
  assert.equal(isAllowedOrigin('https://example.com', configuredOrigins), false);
  assert.equal(isAllowedOrigin('not-a-url', configuredOrigins), false);
});
