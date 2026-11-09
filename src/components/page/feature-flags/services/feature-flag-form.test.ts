import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FeatureFlagItem, FeatureFlagRow } from '@/client/types';
import {
  busyFlagKeys,
  currentEnabled,
  describeAudience,
  displayEnabled,
  effectiveSettings,
  featureFlagFormSchema,
  groupFlags,
  splitLabel,
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

const NO_LIMIT = { platforms: [], flavors: [], minVersionCode: null, maxVersionCode: null };

test('splitLabel pulls the menu path and the parenthesised note out of the name', () => {
  assert.deepEqual(splitLabel('지갑 무료충전 T'), { name: '지갑 무료충전 T', hint: null });
  assert.deepEqual(splitLabel('설정 > 기타 > 쿠폰'), { name: '쿠폰', hint: '설정 > 기타' });
  assert.deepEqual(splitLabel('PDF 내보내기 (카드 헤더·목록·설정)'), {
    name: 'PDF 내보내기',
    hint: '카드 헤더·목록·설정',
  });
  assert.deepEqual(splitLabel('광장 도서관 (앱 API 준비 전 — 켜도 효과 없음)'), {
    name: '광장 도서관',
    hint: '앱 API 준비 전 — 켜도 효과 없음',
  });
});

test('groupFlags groups by key prefix in first-seen order and sends unknown prefixes to 기타', () => {
  const groups = groupFlags([
    item({ key: 'wallet.a' }),
    item({ key: 'ads.a' }),
    item({ key: 'wallet.b' }),
    item({ key: 'new.a' }),
    item({ key: 'etc.coupon' }),
  ]);
  assert.deepEqual(
    groups.map((g) => [g.title, g.items.map((i) => i.key)]),
    [
      ['지갑', ['wallet.a', 'wallet.b']],
      ['광고', ['ads.a']],
      ['기타', ['new.a', 'etc.coupon']],
    ],
  );
});

test('effectiveSettings mirrors what the app does when there is no server row', () => {
  assert.deepEqual(effectiveSettings(item({ appDefault: 'on' })), { ...NO_LIMIT, enabled: true, description: '' });
  assert.deepEqual(effectiveSettings(item({ appDefault: 'off' })), { ...NO_LIMIT, enabled: false, description: '' });
  // 빌드 설정 키는 일반 빌드에서만 켜지고 화웨이 빌드에는 값이 없어 꺼진다.
  assert.deepEqual(effectiveSettings(item({ appDefault: 'env' })), {
    ...NO_LIMIT,
    flavors: ['global'],
    enabled: true,
    description: '',
  });
  const existing = row({ enabled: false, platforms: ['ios'], description: '메모' });
  assert.deepEqual(effectiveSettings(item({ appDefault: 'env', row: existing })), {
    enabled: false,
    platforms: ['ios'],
    flavors: [],
    minVersionCode: null,
    maxVersionCode: null,
    description: '메모',
  });
});

test('displayEnabled and toToggleParams follow the effective settings', () => {
  assert.equal(displayEnabled(item({ appDefault: 'env' })), true);
  assert.equal(displayEnabled(item({ appDefault: 'on', row: row({ enabled: false }) })), false);
  assert.deepEqual(toToggleParams(item({ appDefault: 'env' }), false), {
    ...NO_LIMIT,
    flavors: ['global'],
    enabled: false,
    description: '',
  });
  const existing = row({ enabled: false, platforms: ['ios'], minVersionCode: 250, description: '메모' });
  assert.deepEqual(toToggleParams(item({ row: existing }), true), {
    enabled: true,
    platforms: ['ios'],
    flavors: [],
    minVersionCode: 250,
    maxVersionCode: null,
    description: '메모',
  });
});

test('describeAudience is null without limits and short otherwise', () => {
  assert.equal(describeAudience(NO_LIMIT), null);
  assert.equal(describeAudience({ ...NO_LIMIT, platforms: ['ios', 'android'], flavors: ['global', 'huawei'] }), null);
  assert.equal(describeAudience({ ...NO_LIMIT, flavors: ['global'] }), '화웨이 제외');
  assert.equal(
    describeAudience({ platforms: ['ios'], flavors: ['huawei'], minVersionCode: 250, maxVersionCode: 260 }),
    'iOS만 · 화웨이만 · 버전 코드 250–260',
  );
  assert.equal(describeAudience({ ...NO_LIMIT, minVersionCode: 250 }), '버전 코드 250 이상');
  assert.equal(describeAudience({ ...NO_LIMIT, maxVersionCode: 260 }), '버전 코드 260 이하');
});

test('describeAudience names known versions', () => {
  const options = [
    { code: 255, name: '1.4.2', users: 40 },
    { code: 250, name: '1.4.0', users: 55 },
  ];
  assert.equal(describeAudience({ ...NO_LIMIT, minVersionCode: 250 }, options), '1.4.0 (250) 이상');
  assert.equal(describeAudience({ ...NO_LIMIT, maxVersionCode: 251 }, options), '코드 251 이하');
  assert.equal(
    describeAudience({ ...NO_LIMIT, platforms: ['ios'], minVersionCode: 250, maxVersionCode: 255 }, options),
    'iOS만 · 1.4.0 (250) – 1.4.2 (255)',
  );
});

test('toFormValues reads the effective settings', () => {
  assert.deepEqual(toFormValues(item({ appDefault: 'env' })), {
    description: '',
    platform: 'all',
    flavor: 'global',
    minVersionCode: '',
    maxVersionCode: '',
  });
  assert.equal(toFormValues(item({ row: row({ platforms: ['ios', 'android'] }) })).platform, 'all');
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

test('schema rejects malformed version codes, a reversed range and long notes', () => {
  const base = toFormValues(item({}));
  for (const v of ['0', ' 250 ', '250.0', '1e3', '-1', '2147483648']) {
    assert.equal(featureFlagFormSchema.safeParse({ ...base, minVersionCode: v }).success, false, v);
  }
  const reversed = featureFlagFormSchema.safeParse({ ...base, minVersionCode: '260', maxVersionCode: '250' });
  assert.equal(reversed.success, false);
  assert.deepEqual(reversed.error?.issues[0].path, ['maxVersionCode']);
  assert.equal(featureFlagFormSchema.safeParse({ ...base, description: 'a'.repeat(192) }).success, false);
  assert.equal(featureFlagFormSchema.safeParse({ ...base, description: ` ${'a'.repeat(191)} ` }).success, true);
  assert.equal(
    featureFlagFormSchema.safeParse({ ...base, minVersionCode: '250', maxVersionCode: '250' }).success,
    true,
  );
  assert.equal(featureFlagFormSchema.safeParse({ ...base, maxVersionCode: '2147483647' }).success, true);
});

test('toErrorMessage prefers the server message for both 400 shapes', () => {
  const typia = { response: { data: { path: '$input.platforms[0]', reason: 'x', message: 'platforms 형식 오류' } } };
  const rule = { response: { data: { code: 16, statusCode: 400, message: '최소 버전이 최대 버전보다 큽니다.' } } };
  assert.equal(toErrorMessage(typia), 'platforms 형식 오류');
  assert.equal(toErrorMessage(rule), '최소 버전이 최대 버전보다 큽니다.');
  assert.equal(toErrorMessage(new Error('Network Error')), 'Network Error');
});

test('busyFlagKeys collects every key with a PUT in flight', () => {
  const keys = busyFlagKeys([{ key: 'a' }, { key: 'b' }, undefined, { other: 1 }]);
  assert.deepEqual(Array.from(keys).sort(), ['a', 'b']);
});

test('currentEnabled reads the latest list, not the snapshot the dialog opened with', () => {
  const snapshot = item({ key: 'k', row: row({ key: 'k', enabled: true }) });
  const latest = { items: [item({ key: 'k', row: row({ key: 'k', enabled: false }) })] };
  assert.equal(currentEnabled(latest, snapshot), false);
  assert.equal(currentEnabled(undefined, snapshot), true);
  assert.equal(currentEnabled({ items: [] }, snapshot), true);
  assert.equal(currentEnabled({ items: [item({ key: 'k', appDefault: 'off' })] }, item({ key: 'k' })), false);
});
