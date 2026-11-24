import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bannerFormSchema } from './banner-form';

const base = {
  locale: 'ko',
  name: '시즌 프로모션',
  location: 'home',
  link: 'https://example.com',
  orderIndex: 1,
  isActive: true,
  startAt: '',
  endAt: '',
};

const endAtErrors = (values: Partial<typeof base>) => {
  const result = bannerFormSchema.safeParse({ ...base, ...values });
  return result.success ? [] : result.error.issues.filter((i) => i.path[0] === 'endAt').map((i) => i.message);
};

test('an empty period is valid on both sides', () => {
  assert.equal(bannerFormSchema.safeParse(base).success, true);
  assert.deepEqual(endAtErrors({ startAt: '2026-12-01T00:00' }), []);
  assert.deepEqual(endAtErrors({ endAt: '2026-12-01T00:00' }), []);
});

test('start must be before end', () => {
  assert.deepEqual(endAtErrors({ startAt: '2026-12-01T00:00', endAt: '2026-12-31T23:59' }), []);
  assert.equal(endAtErrors({ startAt: '2026-12-01T00:00', endAt: '2026-12-01T00:00' }).length, 1);
  assert.equal(endAtErrors({ startAt: '2026-12-02T00:00', endAt: '2026-12-01T00:00' }).length, 1);
});

test('the period error shows even while other fields are still invalid', () => {
  assert.equal(endAtErrors({ name: '', startAt: '2026-12-02T00:00', endAt: '2026-12-01T00:00' }).length, 1);
});
