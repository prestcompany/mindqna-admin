import type {
  FeatureFlagAppVersion,
  FeatureFlagFlavor,
  FeatureFlagPlatform,
  UpdateFeatureFlagParams,
} from '@/client/types';

export type VersionOption = { code: number; name: string };

/** 플랫폼·스토어를 합쳐 코드별로 하나씩. 최신 코드가 먼저. 이름이 여럿이면 가장 최근에 본 이름. */
export function versionOptions(versions: FeatureFlagAppVersion[]): VersionOption[] {
  const byCode = new Map<number, { name: string; lastSeenAt: string }>();
  for (const v of versions) {
    const current = byCode.get(v.versionCode);
    if (!current || v.lastSeenAt > current.lastSeenAt) {
      byCode.set(v.versionCode, { name: v.versionName, lastSeenAt: v.lastSeenAt });
    }
  }
  return Array.from(byCode, ([code, { name }]) => ({ code, name })).sort((a, b) => b.code - a.code);
}

export function formatVersion(code: number, options: VersionOption[]): string {
  const known = options.find((o) => o.code === code);
  return known ? `${known.name} (${code})` : `코드 ${code}`;
}

const PLATFORM_LABEL: Record<FeatureFlagPlatform, string> = { ios: 'iOS', android: 'Android' };
const SEGMENT_ORDER = ['ios|global', 'ios|huawei', 'android|global', 'android|huawei'];

export type SegmentSummary = {
  id: string;
  platform: FeatureFlagPlatform;
  label: string;
  latest: VersionOption;
};

export function segmentSummaries(versions: FeatureFlagAppVersion[]): SegmentSummary[] {
  const segments = new Map<string, SegmentSummary>();
  for (const v of versions) {
    const id = `${v.platform}|${v.flavor}`;
    const current = segments.get(id);
    if (!current || v.versionCode > current.latest.code) {
      segments.set(id, {
        id,
        platform: v.platform,
        label: segmentLabel(v.platform, v.flavor),
        latest: { code: v.versionCode, name: v.versionName },
      });
    }
  }
  return Array.from(segments.values()).sort((a, b) => SEGMENT_ORDER.indexOf(a.id) - SEGMENT_ORDER.indexOf(b.id));
}

function segmentLabel(platform: FeatureFlagPlatform, flavor: FeatureFlagFlavor): string {
  return flavor === 'huawei' ? `${PLATFORM_LABEL[platform]} 화웨이` : PLATFORM_LABEL[platform];
}

type AudienceFields = Pick<UpdateFeatureFlagParams, 'platforms' | 'flavors' | 'minVersionCode' | 'maxVersionCode'>;

/** 조건에 맞는, 이미 나와 있는 버전. 서버 판정(isFeatureOn)과 같은 규칙이다. 최신 코드가 먼저. */
export function coveredVersions(versions: FeatureFlagAppVersion[], settings: AudienceFields): VersionOption[] {
  return versionOptions(
    versions.filter(
      (v) =>
        (!settings.platforms.length || settings.platforms.includes(v.platform)) &&
        (!settings.flavors.length || settings.flavors.includes(v.flavor)) &&
        (settings.minVersionCode == null || v.versionCode >= settings.minVersionCode) &&
        (settings.maxVersionCode == null || v.versionCode <= settings.maxVersionCode),
    ),
  );
}
