import assert from 'node:assert/strict';
import test from 'node:test';

import type { AdminPushItem } from '@/client/push';
import { describePushTarget } from './push-target-display';

const base: AdminPushItem = {
  id: 1,
  title: '공지',
  message: '내용',
  link: null,
  imgUrl: null,
  target: 'ALL',
  locale: 'ko',
  userNames: null,
  groupId: null,
  filter: null,
  pushAt: '2026-10-20T01:00:00.000Z',
  status: 'SCHEDULED',
  targetCount: null,
  targetCountIsApproximate: true,
  sentCount: 0,
  failedCount: 0,
  startedAt: null,
  finishedAt: null,
  lastError: null,
  createdAt: '2026-10-09T01:00:00.000Z',
  updatedAt: '2026-10-09T01:00:00.000Z',
};

test('a filtered push is a 조건 badge with its exact count and every condition in the card', () => {
  const d = describePushTarget({
    ...base,
    target: 'FILTER',
    targetCount: 73_412,
    targetCountIsApproximate: false,
    filter: { spaceTypes: ['friends', 'couple'], spaceLocales: ['ko'], minCardCount: 10, maxCardCount: 41, minPetLevel: 5 },
  });
  assert.equal(d.kind, 'FILTER');
  assert.equal(d.badge, '조건');
  assert.equal(d.summary, 'ko · 73,412명');
  assert.equal(d.card?.title, '조건 발송');
  assert.deepEqual(d.card?.rows, [
    { label: '공간 유형', value: '친구, 커플' },
    { label: '공간 언어', value: 'ko' },
    { label: '질문 수', value: '10~41개' },
    { label: '펫 레벨', value: '5 이상' },
  ]);
  assert.equal(d.card?.footnote, '대상 73,412명 · 저장할 때 확정');
});

test('a single question-count bound reads as open-ended, and zero is kept', () => {
  const rows = (filter: AdminPushItem['filter']) =>
    describePushTarget({ ...base, target: 'FILTER', targetCount: 3, filter }).card?.rows;
  assert.deepEqual(rows({ minCardCount: 42 }), [{ label: '질문 수', value: '42개 이상' }]);
  assert.deepEqual(rows({ maxCardCount: 0 }), [{ label: '질문 수', value: '0개 이하' }]);
});

test('a broadcast shows its locale, an approximate count once known, and no card', () => {
  assert.equal(describePushTarget(base).summary, 'ko');
  const sent = describePushTarget({ ...base, targetCount: 445_120 });
  assert.equal(sent.kind, 'ALL');
  assert.equal(sent.badge, '전체');
  assert.equal(sent.summary, 'ko · 약 445,120명');
  assert.equal(sent.card, null);
});

test('a per-user send counts its names and lists at most ten in the card', () => {
  const names = Array.from({ length: 12 }, (_, i) => `user${i + 1}`);
  const d = describePushTarget({ ...base, target: 'USER', locale: null, userNames: names });
  assert.equal(d.kind, 'USER');
  assert.equal(d.badge, '개인');
  assert.equal(d.summary, '12명');
  assert.equal(d.card?.title, '개인 발송');
  assert.deepEqual(d.card?.rows, [{ label: '받는 사람', value: `${names.slice(0, 10).join(', ')} 외 2명` }]);
});

test('a campaign saved before FILTER existed is a 조건 badge that says how it was split', () => {
  const d = describePushTarget({ ...base, target: 'USER', locale: null, userNames: ['a'], targetCount: 8_014 }, 5);
  assert.equal(d.kind, 'LEGACY');
  assert.equal(d.badge, '조건');
  assert.equal(d.summary, '8,014명');
  assert.deepEqual(d.card?.rows, [{ label: '저장 방식', value: '이전 방식 · 5개로 나뉨' }]);
});
