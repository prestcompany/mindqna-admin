import assert from 'node:assert/strict';
import test from 'node:test';

import { unzipSync } from 'fflate';

import type { BookExportBook, BookExportBooksResult, BookExportRequestOrder } from '../../../../client/types';
import { runBookZipDownload } from './run-book-zip-download';

function buildOrders(count: number): BookExportRequestOrder[] {
  return Array.from({ length: count }, (_, i) => ({
    orderNo: `O-${i}`,
    spaceId: 'ABCD1234',
    startOrder: 1,
    endOrder: 30,
    coverColor: '브라운',
    paidInner: '선택 안함',
  }));
}

function buildBook(orderNo: string): BookExportBook {
  return {
    orderNo,
    coverColor: '브라운',
    paidInner: '선택 안함',
    cover: { spaceName: '우리', startOrder: 1, endOrder: 30, count: 30, generatedAt: '2026-10-01', locale: 'ko' },
    cards: [],
  };
}

async function fetchAll(chunk: BookExportRequestOrder[]): Promise<BookExportBooksResult> {
  return { books: chunk.map((order) => buildBook(order.orderNo)), rejected: [] };
}

test('fetches 20 orders per request and zips every order exactly once', async () => {
  const sizes: number[] = [];
  const progress: number[] = [];
  const run = await runBookZipDownload({
    orders: buildOrders(41),
    fetchBooks: async (chunk) => {
      sizes.push(chunk.length);
      return fetchAll(chunk);
    },
    onProgress: (done) => progress.push(done),
  });
  assert.deepEqual(sizes, [20, 20, 1]);
  assert.deepEqual(progress, [20, 40, 41]);
  assert.equal(run.bookCount, 41);
  const files = unzipSync(new Uint8Array(await run.zip.arrayBuffer()));
  assert.equal(Object.keys(files).length, 41);
});

test('collects the orders the server rejected', async () => {
  const run = await runBookZipDownload({
    orders: buildOrders(2),
    fetchBooks: async (chunk) => ({
      books: [buildBook(chunk[0].orderNo)],
      rejected: [{ orderNo: chunk[1].orderNo, issues: [] }],
    }),
    onProgress: () => undefined,
  });
  assert.equal(run.bookCount, 1);
  assert.deepEqual(run.rejected, [{ orderNo: 'O-1', issues: [] }]);
});

test('retries a failed chunk once and continues', async () => {
  let calls = 0;
  const run = await runBookZipDownload({
    orders: buildOrders(1),
    fetchBooks: async (chunk) => {
      calls += 1;
      if (calls === 1) throw new Error('network');
      return fetchAll(chunk);
    },
    onProgress: () => undefined,
  });
  assert.equal(calls, 2);
  assert.equal(run.bookCount, 1);
});

test('stops at the first chunk that fails twice and fetches nothing after it', async () => {
  const seen: string[] = [];
  await assert.rejects(
    runBookZipDownload({
      orders: buildOrders(45),
      fetchBooks: async (chunk) => {
        seen.push(chunk[0].orderNo);
        if (chunk[0].orderNo === 'O-20') throw new Error('down');
        return fetchAll(chunk);
      },
      onProgress: () => undefined,
    }),
    /down/,
  );
  assert.deepEqual(seen, ['O-0', 'O-20', 'O-20']);
});
