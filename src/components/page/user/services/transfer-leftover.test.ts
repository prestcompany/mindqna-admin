import assert from 'node:assert/strict';
import { test } from 'node:test';
import { leftoverErrorMessage, leftoverProblems, leftoverSummary, toLeftoverBody } from './transfer-leftover';

test('the source must be a temp_ account and differ from the target', () => {
  assert.deepEqual(leftoverProblems({ fromUserName: ' ', toUserName: 'payer01' }), ['정리할 temp_ 계정을 입력하세요.']);
  assert.deepEqual(leftoverProblems({ fromUserName: 'payer02', toUserName: 'payer01' }), [
    'temp_ 로 시작하는 계정만 정리할 수 있습니다.',
  ]);
  assert.deepEqual(leftoverProblems({ fromUserName: 'temp_x', toUserName: 'temp_x' }), [
    '같은 계정으로는 정리할 수 없습니다.',
  ]);
  assert.deepEqual(leftoverProblems({ fromUserName: ' temp_abc ', toUserName: 'payer01' }), []);
});

test('the body trims the temp_ username', () => {
  assert.deepEqual(toLeftoverBody({ fromUserName: ' temp_abc ', toUserName: 'payer01' }), {
    fromUserName: 'temp_abc',
    toUserName: 'payer01',
  });
});

test('the result reads as three lines, with deactivated gold clubs as duplicates cleaned up', () => {
  assert.deepEqual(leftoverSummary({ ledgerRows: 3, skippedTicketLedgers: 1, deactivatedClubs: [12, 15] }), [
    '구매 원장 3건을 이 계정으로 옮겼습니다.',
    '건너뛴 티켓 원장 1건',
    '중복 골드클럽 정리: 2건 비활성(id 12, 15)',
  ]);
  assert.deepEqual(leftoverSummary({ ledgerRows: 0, skippedTicketLedgers: 0, deactivatedClubs: [] }), [
    '구매 원장 0건을 이 계정으로 옮겼습니다.',
    '건너뛴 티켓 원장 0건',
    '중복 골드클럽 정리: 없음',
  ]);
});

test('a 404 means a user is missing; 400 shows the server message', () => {
  const err = (status: number, message: string) => ({ response: { status, data: { message } } });
  assert.equal(leftoverErrorMessage(err(404, 'Not Found')), '사용자를 찾지 못했습니다.');
  assert.equal(
    leftoverErrorMessage(err(400, '로그인 수단이 남아 있는 계정은 정리할 수 없습니다.')),
    '로그인 수단이 남아 있는 계정은 정리할 수 없습니다.',
  );
});
