import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addDays,
  bannerStatus,
  daysInRange,
  defaultStatsRange,
  formatCtr,
  formatKstDateTime,
  isoToKstInput,
  kstDateOf,
  kstInputToIso,
  periodError,
  statsRangeError,
  viewsClicksNotice,
} from './banner-period';

test('kstInputToIso reads the input as KST and returns UTC', () => {
  assert.equal(kstInputToIso('2026-12-01T09:00'), '2026-12-01T00:00:00.000Z');
  // KST midnight is the previous UTC day.
  assert.equal(kstInputToIso('2026-12-01T00:00'), '2026-11-30T15:00:00.000Z');
  // Year boundary.
  assert.equal(kstInputToIso('2027-01-01T08:59'), '2026-12-31T23:59:00.000Z');
});

test('kstInputToIso treats empty or malformed input as no limit', () => {
  assert.equal(kstInputToIso(''), null);
  assert.equal(kstInputToIso('   '), null);
  assert.equal(kstInputToIso('2026-12-01'), null);
  assert.equal(kstInputToIso('not a date'), null);
});

test('isoToKstInput shows a UTC instant as KST wall clock', () => {
  assert.equal(isoToKstInput('2026-11-30T15:00:00.000Z'), '2026-12-01T00:00');
  assert.equal(isoToKstInput('2026-12-31T23:59:00Z'), '2027-01-01T08:59');
  assert.equal(isoToKstInput(null), '');
  assert.equal(isoToKstInput(undefined), '');
  assert.equal(isoToKstInput('garbage'), '');
});

test('KST input survives a round trip through UTC', () => {
  for (const value of ['2026-02-28T23:30', '2028-02-29T00:00', '2026-11-24T18:05']) {
    assert.equal(isoToKstInput(kstInputToIso(value)), value);
  }
});

test('formatKstDateTime and kstDateOf use the KST day', () => {
  assert.equal(formatKstDateTime('2026-11-30T15:00:00.000Z'), '2026.12.01 00:00');
  assert.equal(formatKstDateTime(null), '');
  assert.equal(kstDateOf(new Date('2026-11-30T14:59:59.999Z')), '2026-11-30');
  assert.equal(kstDateOf(new Date('2026-11-30T15:00:00.000Z')), '2026-12-01');
});

test('bannerStatus: the switch wins over the period', () => {
  const now = new Date('2026-11-24T00:00:00Z');
  assert.equal(bannerStatus({ isActive: false }, now), 'inactive');
  assert.equal(
    bannerStatus({ isActive: false, startAt: '2026-11-01T00:00:00Z', endAt: '2026-12-01T00:00:00Z' }, now),
    'inactive',
  );
});

test('bannerStatus follows the period with empty bounds meaning no limit', () => {
  const now = new Date('2026-11-24T00:00:00Z');
  assert.equal(bannerStatus({ isActive: true }, now), 'live');
  assert.equal(bannerStatus({ isActive: true, startAt: null, endAt: null }, now), 'live');
  assert.equal(bannerStatus({ isActive: true, startAt: '2026-11-25T00:00:00Z' }, now), 'scheduled');
  assert.equal(bannerStatus({ isActive: true, endAt: '2026-11-23T00:00:00Z' }, now), 'ended');
  assert.equal(
    bannerStatus({ isActive: true, startAt: '2026-11-01T00:00:00Z', endAt: '2026-12-01T00:00:00Z' }, now),
    'live',
  );
});

test('bannerStatus: start is inclusive, end is exclusive', () => {
  const at = '2026-11-24T00:00:00.000Z';
  const now = new Date(at);
  assert.equal(bannerStatus({ isActive: true, startAt: at }, now), 'live');
  assert.equal(bannerStatus({ isActive: true, endAt: at }, now), 'ended');
});

test('periodError requires start before end only when both are set', () => {
  assert.equal(periodError('', ''), null);
  assert.equal(periodError('2026-12-01T00:00', ''), null);
  assert.equal(periodError('', '2026-12-01T00:00'), null);
  assert.equal(periodError('2026-12-01T00:00', '2026-12-01T00:01'), null);
  assert.ok(periodError('2026-12-01T00:00', '2026-12-01T00:00'));
  assert.ok(periodError('2026-12-02T00:00', '2026-12-01T00:00'));
});

test('addDays and daysInRange work on calendar dates', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(daysInRange('2026-11-24', '2026-11-24'), 1);
  assert.equal(daysInRange('2026-01-01', '2026-12-31'), 365);
});

test('defaultStatsRange uses the period clamped to today', () => {
  const now = new Date('2026-11-24T03:00:00Z'); // 2026-11-24 12:00 KST
  // Running banner: start → today.
  assert.deepEqual(defaultStatsRange({ startAt: '2026-11-01T00:00:00Z', endAt: '2026-12-31T00:00:00Z' }, now), {
    from: '2026-11-01',
    to: '2026-11-24',
  });
  // Ended banner: start → end, in KST days.
  assert.deepEqual(defaultStatsRange({ startAt: '2026-10-01T00:00:00Z', endAt: '2026-10-10T15:00:00Z' }, now), {
    from: '2026-10-01',
    to: '2026-10-11',
  });
});

test('defaultStatsRange falls back to the last 30 days', () => {
  const now = new Date('2026-11-24T03:00:00Z');
  const last30 = { from: '2026-10-26', to: '2026-11-24' };
  assert.deepEqual(defaultStatsRange({}, now), last30);
  assert.deepEqual(defaultStatsRange({ startAt: null, endAt: null }, now), last30);
  // Not started yet.
  assert.deepEqual(defaultStatsRange({ startAt: '2026-12-01T00:00:00Z' }, now), last30);
});

test('defaultStatsRange never exceeds the 366-day cap', () => {
  const now = new Date('2026-11-24T03:00:00Z');
  const range = defaultStatsRange({ startAt: '2024-01-01T00:00:00Z' }, now);
  assert.equal(range.to, '2026-11-24');
  assert.equal(daysInRange(range.from, range.to), 366);
  assert.equal(statsRangeError(range), null);
});

test('statsRangeError mirrors the endpoint limits', () => {
  assert.equal(statsRangeError({ from: '2026-11-01', to: '2026-11-01' }), null);
  assert.ok(statsRangeError({ from: '2026-11-02', to: '2026-11-01' }));
  assert.ok(statsRangeError({ from: '2025-01-01', to: '2026-01-02' }));
});

test('viewsClicksNotice speaks only when the range starts before statsSince', () => {
  assert.equal(viewsClicksNotice('2026-11-20', '2026-11-20'), null);
  assert.equal(viewsClicksNotice('2026-11-19', '2026-11-20'), '노출·클릭은 2026.11.20부터 집계돼요.');
  // A full ISO instant is read as its KST day.
  assert.equal(viewsClicksNotice('2026-11-19', '2026-11-19T15:00:00.000Z'), '노출·클릭은 2026.11.20부터 집계돼요.');
  assert.ok(viewsClicksNotice('2026-11-19', null));
});

test('formatCtr shows a ratio as a percentage', () => {
  assert.equal(formatCtr(0.0123), '1.23%');
  assert.equal(formatCtr(0), '0.00%');
  assert.equal(formatCtr(1), '100.00%');
  assert.equal(formatCtr(null), '-');
});
