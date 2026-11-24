import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import handler from '../pages/api/s3-asset';
import { MAX_ASSET_BYTES } from './s3-asset';

type Captured = { status: number; headers: Record<string, string>; body: Buffer | null; ended: boolean };

function call(query: Record<string, unknown>, method = 'GET') {
  const out: Captured = { status: 200, headers: {}, body: null, ended: false };
  const res = {
    setHeader(name: string, value: string) {
      out.headers[name.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      out.status = code;
      return res;
    },
    send(body: Buffer) {
      out.body = body;
      out.ended = true;
      return res;
    },
    end() {
      out.ended = true;
      return res;
    },
  };
  return { out, run: () => handler({ method, query } as never, res as never) };
}

const realFetch = globalThis.fetch;
const realWarn = console.warn;
const realError = console.error;
let fetched: string[] = [];
let fetchInit: RequestInit | undefined;
let logged: string[] = [];
function stubFetch(status: number, type: string, body: BodyInit = '{"v":"5.7"}', extra: Record<string, string> = {}) {
  fetched = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    fetched.push(String(url));
    fetchInit = init;
    return new Response(body, { status, headers: { 'content-type': type, ...extra } });
  }) as typeof fetch;
}
beforeEach(() => {
  logged = [];
  console.warn = console.error = (msg: unknown) => void logged.push(String(msg));
});
afterEach(() => {
  globalThis.fetch = realFetch;
  console.warn = realWarn;
  console.error = realError;
});

function assertSafeHeaders(out: Captured) {
  assert.equal(out.headers['x-content-type-options'], 'nosniff');
  assert.equal(out.headers['content-disposition'], 'attachment');
  assert.equal(out.headers['content-security-policy'], "sandbox; default-src 'none'");
}

test('a JSON admin asset is passed through with the safety headers and a short cache', async () => {
  stubFetch(200, 'application/json', '{"v":"5.7"}', { 'set-cookie': 'a=b' });
  const { out, run } = call({ key: '2026-11-14/heart.json' });
  await run();
  assert.deepEqual(fetched, ['https://mindqna.s3.amazonaws.com/2026-11-14/heart.json']);
  assert.equal(out.status, 200);
  assert.equal(out.body?.toString(), '{"v":"5.7"}');
  assert.equal(out.headers['content-type'], 'application/json');
  assert.equal(out.headers['cache-control'], 'public, max-age=300');
  assert.equal(out.headers['set-cookie'], undefined);
  assert.ok(fetchInit?.signal, 'the upstream fetch has a timeout');
  assertSafeHeaders(out);
});

test('an older upload stored as octet-stream or text/plain still passes when it is JSON', async () => {
  for (const type of ['application/octet-stream', 'text/plain', 'binary/octet-stream']) {
    stubFetch(200, type, '{"v":"5.7"}');
    const { out, run } = call({ key: '2026-11-14/heart.json' });
    await run();
    assert.equal(out.status, 200, type);
    assert.equal(out.body?.toString(), '{"v":"5.7"}');
    assert.equal(out.headers['content-type'], 'application/json');
    assertSafeHeaders(out);
  }
});

test('a body that is not JSON answers 415 with no body, whatever S3 says it is', async () => {
  for (const type of ['text/html', 'application/json']) {
    stubFetch(200, type, '<script>steal()</script>');
    const { out, run } = call({ key: '2026-11-14/evil.json' });
    await run();
    assert.equal(out.status, 415, type);
    assert.equal(out.body, null);
    assert.equal(out.ended, true);
    assertSafeHeaders(out);
  }
});

test('an asset over the Vercel response limit answers 413 with a log line', async () => {
  stubFetch(200, 'application/json', '{}', { 'content-length': String(MAX_ASSET_BYTES + 1) });
  const declared = call({ key: '2026-11-14/huge.json' });
  await declared.run();
  assert.equal(declared.out.status, 413);
  assert.equal(declared.out.body, null);
  assertSafeHeaders(declared.out);

  stubFetch(200, 'application/json', `"${'a'.repeat(MAX_ASSET_BYTES)}"`);
  const streamed = call({ key: '2026-11-14/huge.json' });
  await streamed.run();
  assert.equal(streamed.out.status, 413);
  assert.equal(streamed.out.body, null);

  assert.equal(logged.length, 2);
  assert.match(logged[0], /\[s3-asset\] too large: 2026-11-14\/huge\.json/);
});

test('a refused key answers 400 without calling S3', async () => {
  stubFetch(200, 'application/json');
  for (const key of ['u/3f2c9a1e-8b7d-4c21-9f0a-1d2e3f4a5b6c/2026-11-14/x.json', '2026-11-14/x.html', undefined]) {
    const { out, run } = call({ key });
    await run();
    assert.equal(out.status, 400, String(key));
    assert.equal(out.body, null);
    assertSafeHeaders(out);
  }
  assert.deepEqual(fetched, []);
});

test('an upstream miss keeps its status without a body', async () => {
  stubFetch(404, 'application/xml', '<Error/>');
  const { out, run } = call({ key: '2026-11-14/gone.json' });
  await run();
  assert.equal(out.status, 404);
  assert.equal(out.body, null);
  assertSafeHeaders(out);
});

test('only GET is allowed', async () => {
  stubFetch(200, 'application/json');
  const { out, run } = call({ key: '2026-11-14/heart.json' }, 'POST');
  await run();
  assert.equal(out.status, 405);
  assert.equal(out.headers['allow'], 'GET');
  assertSafeHeaders(out);
});

test('a network failure or timeout answers 502 without a body', async () => {
  globalThis.fetch = (async () => {
    throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
  }) as typeof fetch;
  const { out, run } = call({ key: '2026-11-14/heart.json' });
  await run();
  assert.equal(out.status, 502);
  assert.equal(out.body, null);
  assertSafeHeaders(out);
  assert.match(logged[0], /\[s3-asset\] upstream failed: 2026-11-14\/heart\.json/);
});

test('a body that breaks off mid-read answers 502, not an unhandled error', async () => {
  const broken = new ReadableStream({
    pull(controller) {
      controller.error(new Error('socket hang up'));
    },
  });
  stubFetch(200, 'application/json', broken);
  const { out, run } = call({ key: '2026-11-14/heart.json' });
  await run();
  assert.equal(out.status, 502);
  assert.equal(out.body, null);
  assertSafeHeaders(out);
  assert.equal(logged.length, 1);
});
