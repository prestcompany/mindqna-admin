import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MEMO_MAX, sandboxTesterProblems, saveErrorMessage, toSaveInput } from './sandbox-tester-form';

test('userId and memo are both required after trimming', () => {
  assert.deepEqual(sandboxTesterProblems({ userId: ' ', memo: '' }), ['userId 를 입력하세요.', '메모를 입력하세요.']);
  assert.deepEqual(sandboxTesterProblems({ userId: 'u-1', memo: 'QA' }), []);
});

test('the memo is at most 191 characters, the server limit', () => {
  assert.equal(MEMO_MAX, 191);
  assert.deepEqual(sandboxTesterProblems({ userId: 'u-1', memo: 'a'.repeat(191) }), []);
  assert.deepEqual(sandboxTesterProblems({ userId: 'u-1', memo: 'a'.repeat(192) }), ['메모는 191자까지입니다.']);
});

test('the saved values are trimmed', () => {
  assert.deepEqual(toSaveInput({ userId: '  u-1 ', memo: ' QA 담당자 ' }), { userId: 'u-1', memo: 'QA 담당자' });
});

test('a 404 means no such user; other errors show the server message', () => {
  const err = (status: number, message?: string) => ({ response: { status, data: { message } } });
  assert.equal(saveErrorMessage(err(404, 'Not Found')), '그 userId 의 사용자가 없습니다.');
  assert.equal(saveErrorMessage(err(400, 'bad memo')), 'bad memo');
  assert.equal(saveErrorMessage(new Error('Network Error')), 'Network Error');
});
