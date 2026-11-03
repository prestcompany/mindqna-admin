import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FeatureFlagItem, FeatureFlagRow } from '@/client/types';
import {
  APP_DEFAULT_LABEL,
  displayEnabled,
  featureFlagCreateSchema,
  featureFlagFormSchema,
  initialEnabled,
  summarizeConditions,
  toErrorMessage,
  toFormValues,
  toToggleParams,
  toUpdateParams,
} from './feature-flag-form';

function row(partial: Partial<FeatureFlagRow>): FeatureFlagRow {
  return {
    key: 'wallet.offerwall.tnk',
    enabled: true,
    platforms: [],
    flavors: [],
    minVersionCode: null,
    maxVersionCode: null,
    description: '',
    updatedAt: '2026-11-03T06:00:00.000Z',
    ...partial,
  };
}

function item(partial: Partial<FeatureFlagItem>): FeatureFlagItem {
  return { key: 'wallet.offerwall.tnk', label: '지갑 무료충전 T', appDefault: 'on', row: null, ...partial };
}

test('summarizeConditions describes each condition', () => {
  const none = { platforms: [], flavors: [], minVersionCode: null, maxVersionCode: null };
  assert.equal(summarizeConditions(none), '전체 플랫폼 · 전체 flavor · 버전 제한 없음');
  assert.equal(
    summarizeConditions({ ...none, platforms: ['ios'], flavors: ['huawei'], minVersionCode: 250, maxVersionCode: 260 }),
    'iOS · huawei · 250–260',
  );
  assert.equal(summarizeConditions({ ...none, minVersionCode: 250 }), '전체 플랫폼 · 전체 flavor · 250 이상');
  assert.equal(summarizeConditions({ ...none, maxVersionCode: 260 }), '전체 플랫폼 · 전체 flavor · 260 이하');
});

test('toFormValues treats both platforms as all', () => {
  assert.equal(toFormValues(row({ platforms: ['ios', 'android'] })).platform, 'all');
  assert.deepEqual(toFormValues(null), {
    description: '',
    platform: 'all',
    flavor: 'all',
    minVersionCode: '',
    maxVersionCode: '',
  });
});

test('toUpdateParams maps all to empty arrays and blanks to null', () => {
  assert.deepEqual(
    toUpdateParams(
      { description: ' 메모 ', platform: 'android', flavor: 'all', minVersionCode: '250', maxVersionCode: '' },
      true,
    ),
    {
      enabled: true,
      platforms: ['android'],
      flavors: [],
      minVersionCode: 250,
      maxVersionCode: null,
      description: '메모',
    },
  );
});

test('schema rejects malformed version codes, min > max and long descriptions', () => {
  const base = toFormValues(null);
  for (const v of ['0', ' 250 ', '250.0', '1e3', '-1', '2147483648']) {
    assert.equal(featureFlagFormSchema.safeParse({ ...base, minVersionCode: v }).success, false, v);
  }
  const reversed = featureFlagFormSchema.safeParse({ ...base, minVersionCode: '260', maxVersionCode: '250' });
  assert.equal(reversed.success, false);
  assert.deepEqual(reversed.error?.issues[0].path, ['maxVersionCode']);
  assert.equal(featureFlagFormSchema.safeParse({ ...base, description: 'a'.repeat(192) }).success, false);
  assert.equal(
    featureFlagFormSchema.safeParse({ ...base, minVersionCode: '250', maxVersionCode: '250' }).success,
    true,
  );
  assert.equal(featureFlagFormSchema.safeParse({ ...base, maxVersionCode: '2147483647' }).success, true);
});

test('toToggleParams keeps existing conditions and creates an unconditioned row otherwise', () => {
  const existing = row({ enabled: false, platforms: ['ios'], minVersionCode: 250, description: '메모' });
  assert.deepEqual(toToggleParams(item({ row: existing }), true), {
    enabled: true,
    platforms: ['ios'],
    flavors: [],
    minVersionCode: 250,
    maxVersionCode: null,
    description: '메모',
  });
  assert.deepEqual(toToggleParams(item({ row: null }), true), {
    enabled: true,
    platforms: [],
    flavors: [],
    minVersionCode: null,
    maxVersionCode: null,
    description: '',
  });
});

test('displayEnabled falls back to the app default only when there is no row', () => {
  assert.equal(displayEnabled(item({ appDefault: 'on', row: null })), true);
  assert.equal(displayEnabled(item({ appDefault: 'env', row: null })), false);
  assert.equal(displayEnabled(item({ appDefault: 'on', row: row({ enabled: false }) })), false);
});

test('app default labels', () => {
  assert.deepEqual(APP_DEFAULT_LABEL, { on: '켬', off: '끔', env: '빌드 설정' });
});

test('toErrorMessage prefers the server message for both 400 shapes', () => {
  const typia = { response: { data: { path: '$input.platforms[0]', reason: 'x', message: 'platforms 형식 오류' } } };
  const rule = { response: { data: { code: 16, statusCode: 400, message: '최소 버전이 최대 버전보다 큽니다.' } } };
  assert.equal(toErrorMessage(typia), 'platforms 형식 오류');
  assert.equal(toErrorMessage(rule), '최소 버전이 최대 버전보다 큽니다.');
  assert.equal(toErrorMessage(new Error('Network Error')), 'Network Error');
});

test('a new row starts from the app default, env keys must be chosen', () => {
  assert.equal(initialEnabled(item({ appDefault: 'on', row: null })), true);
  assert.equal(initialEnabled(item({ appDefault: 'off', row: null })), false);
  assert.equal(initialEnabled(item({ appDefault: 'env', row: null })), null);
  assert.equal(initialEnabled(item({ appDefault: 'on', row: row({ enabled: false }) })), false);
  const base = { ...toFormValues(null), enabled: null };
  const missing = featureFlagCreateSchema.safeParse(base);
  assert.equal(missing.success, false);
  assert.deepEqual(missing.error?.issues[0].path, ['enabled']);
  assert.equal(featureFlagCreateSchema.safeParse({ ...base, enabled: true }).success, true);
  assert.equal(featureFlagCreateSchema.safeParse({ ...base, enabled: true, minVersionCode: '0' }).success, false);
});
