import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assetProxyPath,
  isAdminAssetKey,
  isJsonBody,
  MAX_ASSET_BYTES,
  S3_ASSET_HEADERS,
  upstreamUrl,
} from './s3-asset';

test('admin Lottie keys are <YYYY-MM-DD>/<name>.json', () => {
  assert.equal(isAdminAssetKey('2026-11-14/heart_open.json'), true);
  assert.equal(isAdminAssetKey('2026-11-14/$1794655920483_쪽지.json'), true);
});

test('user uploads, traversal, nesting and other extensions are refused', () => {
  for (const key of [
    'u/3f2c9a1e-8b7d-4c21-9f0a-1d2e3f4a5b6c/2026-11-14/x.json',
    '2026-11-14/../u/x.json',
    '2026-11-14/a/b.json',
    '2026-11-14/x.html',
    '2026-11-14/x.json.html',
    '2026-11-14/.json',
    'exports/a.json',
    '2026-1-14/x.json',
    '/2026-11-14/x.json',
    '2026-11-14/x\\y.json',
    '',
  ]) {
    assert.equal(isAdminAssetKey(key), false, key);
  }
  assert.equal(isAdminAssetKey(undefined), false);
  assert.equal(isAdminAssetKey(['2026-11-14/x.json']), false);
});

test('the upstream URL encodes each key segment', () => {
  assert.equal(
    upstreamUrl('2026-11-14/$1_쪽지 a.json'),
    'https://mindqna.s3.amazonaws.com/2026-11-14/%241_%EC%AA%BD%EC%A7%80%20a.json',
  );
});

test('only a body that parses as JSON passes', () => {
  assert.equal(isJsonBody(Buffer.from('{"v":"5.7","layers":[]}')), true);
  assert.equal(isJsonBody(Buffer.from(' [1, 2] ')), true);
  // 앞에 UTF-8 BOM 이 붙은 Lottie 도 JSON 으로 받는다(브라우저 response.json() 과 같게).
  assert.equal(isJsonBody(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{"v":"5.7"}')])), true);
  for (const body of ['<script>steal()</script>', '<html><body>x</body></html>', '{"v":', '']) {
    assert.equal(isJsonBody(Buffer.from(body)), false, body);
  }
});

test('assets stop under the 4.5MB Vercel response limit in either unit', () => {
  assert.equal(MAX_ASSET_BYTES, 4_000_000);
});

test('every response carries nosniff, attachment and a sandboxing CSP', () => {
  assert.deepEqual(S3_ASSET_HEADERS, {
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'attachment',
    'Content-Security-Policy': "sandbox; default-src 'none'",
  });
});

test('the player asks the route for the decoded key of an S3 URL', () => {
  assert.equal(
    assetProxyPath('https://mindqna.s3.amazonaws.com/2026-11-14/%241_%EC%AA%BD%EC%A7%80.json'),
    '/api/s3-asset?key=2026-11-14%2F%241_%EC%AA%BD%EC%A7%80.json',
  );
  assert.equal(assetProxyPath('not a url'), null);
});
