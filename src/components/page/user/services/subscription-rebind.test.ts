import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { UserProfileRow } from '@/client/types';
import {
  rebindableSpaces,
  rebindErrorMessage,
  rebindOutcomeLabel,
  rebindProblems,
  toRebindBody,
} from './subscription-rebind';

const profile = (over: Partial<UserProfileRow>): UserProfileRow => ({
  id: 'p',
  nickname: 'n',
  spaceId: 's-1',
  spaceName: '우리집',
  isPremium: false,
  isGoldClub: false,
  disabled: false,
  removed: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  ...over,
});

test('only spaces where the user is an active member can be picked', () => {
  const spaces = rebindableSpaces([
    profile({ id: 'a', spaceId: 's-1', spaceName: '우리집' }),
    profile({ id: 'b', spaceId: 's-2', disabled: true }),
    profile({ id: 'c', spaceId: 's-3', removed: true }),
    profile({ id: 'd', spaceId: null }),
    profile({ id: 'e', spaceId: 's-5', spaceName: null }),
  ]);
  assert.deepEqual(spaces, [
    { spaceId: 's-1', label: '우리집' },
    { spaceId: 's-5', label: 's-5' },
  ]);
});

test('platform, transactionId and spaceId are required', () => {
  assert.deepEqual(rebindProblems({ platform: null, transactionId: ' ', spaceId: '' }), [
    '플랫폼을 고르세요.',
    '거래 id 를 입력하세요.',
    '공간을 고르세요.',
  ]);
  assert.deepEqual(rebindProblems({ platform: 'IOS', transactionId: '2000001', spaceId: 's-1' }), []);
});

test('the body trims the transaction id', () => {
  assert.deepEqual(toRebindBody({ platform: 'AOS', transactionId: '  tok  ', spaceId: 's-1' }), {
    platform: 'AOS',
    transactionId: 'tok',
    spaceId: 's-1',
  });
});

test('server errors: 404 and 403 get our words, 400 shows the server message as-is', () => {
  const err = (status: number, code: number, message: string) => ({ response: { status, data: { code, message } } });
  assert.equal(rebindErrorMessage(err(404, 5, 'Not Found')), '사용자나 그 거래 기록을 찾지 못했습니다.');
  assert.equal(rebindErrorMessage(err(403, 4, 'Forbidden')), '이 사용자는 고른 공간의 활동 중인 멤버가 아닙니다.');
  assert.equal(
    rebindErrorMessage(err(400, 16, '원래 계정이 살아 있습니다. 계정 이관을 쓰세요.')),
    '원래 계정이 살아 있습니다. 계정 이관을 쓰세요.',
  );
  const leftover = '다른 계정(이관 전 잔여 데이터)이 이 구독을 갖고 있습니다. 먼저 정리해 주세요.';
  assert.equal(rebindErrorMessage(err(400, 16, leftover)), leftover);
  assert.equal(rebindErrorMessage(new Error('Network Error')), 'Network Error');
});

test('each outcome has a label', () => {
  assert.equal(rebindOutcomeLabel('created'), '새로 지급했습니다.');
  assert.equal(rebindOutcomeLabel('reactivated'), '끊겼던 권한을 다시 살렸습니다.');
  assert.equal(rebindOutcomeLabel('extended'), '권한 기간을 늘렸습니다.');
  assert.equal(rebindOutcomeLabel('noop'), '이미 지급된 상태라 바뀐 것이 없습니다.');
});
