import assert from 'node:assert/strict';
import test from 'node:test';

import { strFromU8, unzipSync } from 'fflate';

import type { BookExportBook } from '../../../../client/types';
import { createBookZipWriter, toBookJson, toZipEntryName } from './book-zip-writer';

const BOOK: BookExportBook = {
  orderNo: '20260930-0000024',
  options: { coverColor: '브라운', purchaseQuestionCount: 30, recordPackage: 'A세트', paidInner: '선택 안함' },
  cover: {
    spaceName: '우리 가족',
    startOrder: 1,
    endOrder: 1,
    count: 1,
    generatedAt: '2026-09-30',
    locale: 'ko',
    firstQuestionDate: '2026-09-01',
    lastQuestionDate: '2026-09-01',
    members: ['엄마'],
  },
  cards: [
    { order: 1, question: '질문', date: '2026-09-01', answers: [{ nickname: '엄마', content: '답변 "따옴표"' }] },
  ],
};

test('writes one {orderNo}.json per book across several adds, with UTF-8 content that round-trips', async () => {
  const writer = await createBookZipWriter();
  writer.add([BOOK]);
  writer.add([{ ...BOOK, orderNo: '20260930-0000025' }]);
  const blob = await writer.finish();
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  assert.deepEqual(Object.keys(files).sort(), ['20260930-0000024.json', '20260930-0000025.json']);
  assert.deepEqual(JSON.parse(strFromU8(files['20260930-0000024.json'])), BOOK);
});

test('produces a valid empty zip when nothing was added', async () => {
  const writer = await createBookZipWriter();
  const blob = await writer.finish();
  assert.deepEqual(unzipSync(new Uint8Array(await blob.arrayBuffer())), {});
});

test('keeps order numbers as file names but neutralizes path characters', () => {
  assert.equal(toZipEntryName('20260930-0000024'), '20260930-0000024.json');
  assert.equal(toZipEntryName('../a/b c'), '___a_b_c.json');
});

test('the zipped entry content is exactly toBookJson(book), so the zip and the preview never diverge', async () => {
  const writer = await createBookZipWriter();
  writer.add([BOOK]);
  const blob = await writer.finish();
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(strFromU8(files['20260930-0000024.json']), toBookJson(BOOK));
});
