import assert from 'node:assert/strict';
import test from 'node:test';

import { campaignStatus, groupPushes } from './push-grouping';

/** Only the fields grouping reads; the rest of AdminPushItem is irrelevant here. */
function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    title: '공지',
    message: '내용',
    link: null,
    imgUrl: null,
    target: 'USER',
    locale: null,
    userNames: [],
    groupId: null,
    pushAt: '2026-01-01T00:00:00.000Z',
    status: 'SCHEDULED',
    targetCount: 1000,
    targetCountIsApproximate: false,
    sentCount: 0,
    failedCount: 0,
    startedAt: null,
    finishedAt: null,
    lastError: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as any;
}

test('a standalone push stays one entry', () => {
  const out = groupPushes([row({ id: 1 }), row({ id: 2 })]);
  assert.equal(out.length, 2);
  assert.deepEqual(
    out.map((e) => e.parts.length),
    [1, 1],
  );
});

test('a campaign folds into a single entry', () => {
  const out = groupPushes([row({ id: 1, groupId: 'g' }), row({ id: 2, groupId: 'g' }), row({ id: 3, groupId: 'g' })]);
  assert.equal(out.length, 1);
  assert.equal(out[0].parts.length, 3);
});

test('campaign counts are summed across parts, not read off the first', () => {
  // Reading the first part would report 1,000 for a 3,000-person campaign — the number the
  // operator uses to decide whether it worked.
  const out = groupPushes([
    row({ id: 1, groupId: 'g', targetCount: 1000, sentCount: 1000, failedCount: 0 }),
    row({ id: 2, groupId: 'g', targetCount: 1000, sentCount: 990, failedCount: 10 }),
    row({ id: 3, groupId: 'g', targetCount: 500, sentCount: 0, failedCount: 0 }),
  ]);
  assert.equal(out[0].targetCount, 2500);
  assert.equal(out[0].sentCount, 1990);
  assert.equal(out[0].failedCount, 10);
});

test('two campaigns do not bleed into each other', () => {
  const out = groupPushes([row({ id: 1, groupId: 'a' }), row({ id: 2, groupId: 'b' }), row({ id: 3, groupId: 'a' })]);
  assert.equal(out.length, 2);
  assert.equal(out[0].parts.length, 2);
  assert.equal(out[1].parts.length, 1);
});

test('a campaign holds the position of its earliest part', () => {
  // Otherwise a campaign jumps around the table every time one of its chunks changes status.
  const out = groupPushes([row({ id: 9 }), row({ id: 1, groupId: 'g' }), row({ id: 8 }), row({ id: 2, groupId: 'g' })]);
  assert.deepEqual(
    out.map((e) => e.id),
    [9, 1, 8],
  );
});

test('an in-flight campaign does not report itself finished', () => {
  // Three chunks done and one still sending is a campaign that can still be stopped; showing
  // 발송 완료 would tell the operator the opposite.
  assert.equal(
    campaignStatus([row({ status: 'SENT' }), row({ status: 'SENT' }), row({ status: 'SENDING' })]),
    'SENDING',
  );
});

test('a campaign with parts left to go is still scheduled', () => {
  assert.equal(campaignStatus([row({ status: 'SENT' }), row({ status: 'SCHEDULED' })]), 'SCHEDULED');
});

test('a broken part outranks a cancelled one', () => {
  assert.equal(campaignStatus([row({ status: 'CANCELED' }), row({ status: 'FAILED' })]), 'FAILED');
});

test('a campaign is only complete when every part is', () => {
  assert.equal(campaignStatus([row({ status: 'SENT' }), row({ status: 'SENT' })]), 'SENT');
});

test('finishedAt stays null until the last part has one', () => {
  const out = groupPushes([
    row({ id: 1, groupId: 'g', status: 'SENT', finishedAt: '2026-01-01T01:00:00.000Z' }),
    row({ id: 2, groupId: 'g', status: 'SENDING', finishedAt: null }),
  ]);
  assert.equal(out[0].finishedAt, null);
});

test('a finished campaign reports its first start and last finish', () => {
  const out = groupPushes([
    row({
      id: 1,
      groupId: 'g',
      status: 'SENT',
      startedAt: '2026-01-01T01:00:00.000Z',
      finishedAt: '2026-01-01T01:10:00.000Z',
    }),
    row({
      id: 2,
      groupId: 'g',
      status: 'SENT',
      startedAt: '2026-01-01T00:30:00.000Z',
      finishedAt: '2026-01-01T02:00:00.000Z',
    }),
  ]);
  assert.equal(out[0].startedAt, '2026-01-01T00:30:00.000Z');
  assert.equal(out[0].finishedAt, '2026-01-01T02:00:00.000Z');
});

test('progress counts how many parts are done', () => {
  const out = groupPushes([
    row({ id: 1, groupId: 'g', status: 'SENT' }),
    row({ id: 2, groupId: 'g', status: 'SENT' }),
    row({ id: 3, groupId: 'g', status: 'SENDING' }),
  ]);
  assert.equal(out[0].finishedParts, 2);
  assert.equal(out[0].parts.length, 3);
});

test('the first error in a campaign is surfaced', () => {
  const out = groupPushes([
    row({ id: 1, groupId: 'g', status: 'SENT' }),
    row({ id: 2, groupId: 'g', status: 'FAILED', lastError: 'boom' }),
  ]);
  assert.equal(out[0].lastError, 'boom');
});

test('an empty list stays empty', () => {
  assert.deepEqual(groupPushes([]), []);
});
