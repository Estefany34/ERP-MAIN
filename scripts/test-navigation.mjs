import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const temporary = await mkdtemp(path.join(tmpdir(), 'fanix-navigation-'));

try {
  const bundle = path.join(temporary, 'navigation.cjs');
  await build({
    entryPoints: [path.join(root, 'apps/web/src/services/navigation.ts')],
    outfile: bundle,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    plugins: [{
      name: 'web-platform',
      setup(builder) {
        builder.onResolve({ filter: /^react-native$/ }, () => ({ path: 'react-native', namespace: 'test-native' }));
        builder.onLoad({ filter: /.*/, namespace: 'test-native' }, () => ({
          contents: "export const Platform = { OS: 'web' };",
          loader: 'js',
        }));
      },
    }],
  });

  const { routeFromUrl } = require(bundle);
  const location = { pathname: '/', search: '?tenant=qa', hash: '#/Documentos' };
  const replacements = [];
  globalThis.window = {
    location,
    history: {
      replaceState(_state, _title, url) {
        replacements.push(url);
        const parsed = new URL(url, 'https://fanix.test');
        location.pathname = parsed.pathname;
        location.search = parsed.search;
        location.hash = parsed.hash;
      },
    },
  };

  assert.equal(routeFromUrl(), 'Dashboard');
  assert.equal(location.hash, '#/Dashboard');
  assert.equal(location.search, '?tenant=qa');
  assert.deepEqual(replacements, ['/?tenant=qa#/Dashboard']);

  location.pathname = '/Documentos';
  location.search = '';
  location.hash = '';
  assert.equal(routeFromUrl(), 'Dashboard');
  assert.equal(location.pathname, '/');
  assert.equal(location.hash, '#/Dashboard');

  location.hash = '#/Ventas';
  const replacementCount = replacements.length;
  assert.equal(routeFromUrl(), 'Ventas');
  assert.equal(replacements.length, replacementCount, 'Known routes are preserved');

  location.hash = '#/%E0%A4%A';
  assert.equal(routeFromUrl(), 'Dashboard');
  assert.equal(location.hash, '#/Dashboard', 'Malformed URL fragments are redirected safely');

  console.log('PASS: legacy Documentos URL and invalid fragments redirect to Dashboard; valid module navigation stays unchanged.');
} finally {
  delete globalThis.window;
  await rm(temporary, { recursive: true, force: true });
}
