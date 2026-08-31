import assert from 'node:assert/strict';
import test from 'node:test';

import { getCardUploaderFileMeta } from './card-uploader-file-meta';

test('returns null when no file has been selected yet', () => {
  const result = getCardUploaderFileMeta();

  assert.equal(result, null);
});

test('returns the selected file name and a readable size label', () => {
  const result = getCardUploaderFileMeta({
    name: 'card-template.xlsx',
    size: 2 * 1024 * 1024,
  });

  assert.deepEqual(result, {
    name: 'card-template.xlsx',
    sizeText: '2.00 MB',
  });
});

test('shows kilobytes for small files', () => {
  const result = getCardUploaderFileMeta({
    name: 'sample.json',
    size: 3200,
  });

  assert.deepEqual(result, {
    name: 'sample.json',
    sizeText: '3 KB',
  });
});
