import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import handler from '../pages/api/s3-asset';

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
let fetched: string[] = [];
function stubFetch(status: number, type: string, body = '{"v":"5.7"}', extra: Record<string, string> = {}) {
  fetched = [];
  globalThis.fetch = (async (url: string) => {
    fetched.push(String(url));
    return new Response(body, { status, headers: { 'content-type': type, ...extra } });
  }) as typeof fetch;
}
afterEach(() => {
  globalThis.fetch = realFetch;
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
  assertSafeHeaders(out);
});

test('a non-JSON upstream answers 415 with no body', async () => {
  stubFetch(200, 'text/html', '<script>steal()</script>');
  const { out, run } = call({ key: '2026-11-14/evil.json' });
  await run();
  assert.equal(out.status, 415);
  assert.equal(out.body, null);
  assert.equal(out.ended, true);
  assertSafeHeaders(out);
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

test('a network failure answers 502 without a body', async () => {
  globalThis.fetch = (async () => {
    throw new Error('down');
  }) as typeof fetch;
  const { out, run } = call({ key: '2026-11-14/heart.json' });
  await run();
  assert.equal(out.status, 502);
  assert.equal(out.body, null);
  assertSafeHeaders(out);
});
