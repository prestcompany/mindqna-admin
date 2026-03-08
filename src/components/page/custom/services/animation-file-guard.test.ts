import assert from 'node:assert/strict';
import test from 'node:test';

import { getCustomAnimationFileError } from './animation-file-guard';

test('returns an error when edit mode replacement is pending but no new file was selected', () => {
  const result = getCustomAnimationFileError({
    isEditMode: true,
    isReplacePending: true,
    hasUploadedFile: false,
  });

  assert.equal(result, '교체할 로티 파일을 선택해주세요.');
});

test('allows edit mode submit when replacement is not pending and an existing file is present', () => {
  const result = getCustomAnimationFileError({
    isEditMode: true,
    isReplacePending: false,
    hasUploadedFile: false,
  });

  assert.equal(result, null);
});

test('requires a file for create mode', () => {
  const result = getCustomAnimationFileError({
    isEditMode: false,
    isReplacePending: false,
    hasUploadedFile: false,
  });

  assert.equal(result, '로티 파일을 업로드해주세요.');
});
