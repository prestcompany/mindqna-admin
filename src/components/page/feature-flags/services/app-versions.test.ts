import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FeatureFlagVersionUsage } from '@/client/types';
import { audienceReach, formatVersion, segmentSummaries, versionOptions } from './app-versions';

function usage(partial: Partial<FeatureFlagVersionUsage>): FeatureFlagVersionUsage {
  return {
    platform: 'android',
    flavor: 'global',
    versionCode: 255,
    versionName: '1.4.2',
    users: 10,
    lastSeenAt: '2026-11-08T10:00:00.000Z',
    ...partial,
  };
}

const VERSIONS = [
  usage({ platform: 'android', versionCode: 255, versionName: '1.4.2', users: 30 }),
  usage({ platform: 'ios', versionCode: 255, versionName: '1.4.2', users: 10 }),
  usage({ platform: 'android', flavor: 'huawei', versionCode: 253, versionName: '1.4.1', users: 5 }),
  usage({ platform: 'android', versionCode: 250, versionName: '1.4.0', users: 40 }),
  usage({ platform: 'ios', versionCode: 250, versionName: '1.4.0', users: 15 }),
];

test('versionOptions merges platforms per code, newest first, with total users', () => {
  assert.deepEqual(versionOptions(VERSIONS), [
    { code: 255, name: '1.4.2', users: 40 },
    { code: 253, name: '1.4.1', users: 5 },
    { code: 250, name: '1.4.0', users: 55 },
  ]);
  assert.deepEqual(versionOptions([]), []);
});

test('versionOptions keeps the name with the most users when a code has several', () => {
  const options = versionOptions([
    usage({ versionName: '9.9.9', users: 1 }),
    usage({ platform: 'ios', versionName: '1.4.2', users: 20 }),
  ]);
  assert.deepEqual(options, [{ code: 255, name: '1.4.2', users: 21 }]);
});

test('formatVersion shows the name when the code is known', () => {
  const options = versionOptions(VERSIONS);
  assert.equal(formatVersion(250, options), '1.4.0 (250)');
  assert.equal(formatVersion(999, options), '코드 999');
});

test('segmentSummaries gives the newest version and its share per platform and store', () => {
  assert.deepEqual(segmentSummaries(VERSIONS), [
    { id: 'ios|global', label: 'iOS', latest: { code: 255, name: '1.4.2' }, latestUsers: 10, users: 25 },
    { id: 'android|global', label: 'Android', latest: { code: 255, name: '1.4.2' }, latestUsers: 30, users: 70 },
    { id: 'android|huawei', label: 'Android 화웨이', latest: { code: 253, name: '1.4.1' }, latestUsers: 5, users: 5 },
  ]);
});

test('audienceReach counts the users the conditions cover', () => {
  const all = { platforms: [], flavors: [], minVersionCode: null, maxVersionCode: null };
  assert.deepEqual(audienceReach(VERSIONS, all), { users: 100, total: 100 });
  assert.deepEqual(audienceReach(VERSIONS, { ...all, minVersionCode: 253 }), { users: 45, total: 100 });
  assert.deepEqual(audienceReach(VERSIONS, { ...all, platforms: ['ios'], maxVersionCode: 250 }), {
    users: 15,
    total: 100,
  });
  assert.deepEqual(audienceReach(VERSIONS, { ...all, flavors: ['global'] }), { users: 95, total: 100 });
  assert.deepEqual(audienceReach(VERSIONS, { ...all, minVersionCode: 300 }), { users: 0, total: 100 });
  assert.equal(audienceReach([], all), null);
});
