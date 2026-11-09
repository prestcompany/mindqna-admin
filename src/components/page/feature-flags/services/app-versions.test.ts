import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FeatureFlagAppVersion } from '@/client/types';
import { coveredVersions, formatVersion, segmentSummaries, versionOptions } from './app-versions';

function seen(partial: Partial<FeatureFlagAppVersion>): FeatureFlagAppVersion {
  return {
    platform: 'android',
    flavor: 'global',
    versionCode: 255,
    versionName: '1.4.2',
    firstSeenAt: '2026-11-01T00:00:00.000Z',
    lastSeenAt: '2026-11-08T00:00:00.000Z',
    ...partial,
  };
}

const VERSIONS = [
  seen({ platform: 'android', versionCode: 255, versionName: '1.4.2' }),
  seen({ platform: 'ios', versionCode: 255, versionName: '1.4.2' }),
  seen({ platform: 'android', flavor: 'huawei', versionCode: 253, versionName: '1.4.1' }),
  seen({ platform: 'android', versionCode: 250, versionName: '1.4.0' }),
  seen({ platform: 'ios', versionCode: 250, versionName: '1.4.0' }),
];

test('versionOptions lists each code once, newest first', () => {
  assert.deepEqual(versionOptions(VERSIONS), [
    { code: 255, name: '1.4.2' },
    { code: 253, name: '1.4.1' },
    { code: 250, name: '1.4.0' },
  ]);
  assert.deepEqual(versionOptions([]), []);
});

test('versionOptions keeps the most recently seen name when a code has several', () => {
  const options = versionOptions([
    seen({ versionName: '1.4.2-old', lastSeenAt: '2026-11-01T00:00:00.000Z' }),
    seen({ platform: 'ios', versionName: '1.4.2', lastSeenAt: '2026-11-08T00:00:00.000Z' }),
  ]);
  assert.deepEqual(options, [{ code: 255, name: '1.4.2' }]);
});

test('formatVersion shows the name when the code is known', () => {
  const options = versionOptions(VERSIONS);
  assert.equal(formatVersion(250, options), '1.4.0 (250)');
  assert.equal(formatVersion(999, options), '코드 999');
});

test('segmentSummaries gives the newest version per platform and store', () => {
  assert.deepEqual(segmentSummaries(VERSIONS), [
    { id: 'ios|global', platform: 'ios', label: 'iOS', latest: { code: 255, name: '1.4.2' } },
    { id: 'android|global', platform: 'android', label: 'Android', latest: { code: 255, name: '1.4.2' } },
    { id: 'android|huawei', platform: 'android', label: 'Android 화웨이', latest: { code: 253, name: '1.4.1' } },
  ]);
});

test('coveredVersions lists the released versions the conditions reach', () => {
  const all = { platforms: [], flavors: [], minVersionCode: null, maxVersionCode: null };
  const codes = (settings: typeof all | Record<string, unknown>) =>
    coveredVersions(VERSIONS, { ...all, ...settings }).map((v) => v.code);
  assert.deepEqual(codes({}), [255, 253, 250]);
  assert.deepEqual(codes({ minVersionCode: 253 }), [255, 253]);
  assert.deepEqual(codes({ platforms: ['ios'], maxVersionCode: 254 }), [250]);
  assert.deepEqual(codes({ flavors: ['huawei'] }), [253]);
  assert.deepEqual(codes({ minVersionCode: 300 }), []);
});
