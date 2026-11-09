import type {
  FeatureFlagFlavor,
  FeatureFlagPlatform,
  FeatureFlagVersionUsage,
  UpdateFeatureFlagParams,
} from '@/client/types';

export type VersionOption = { code: number; name: string; users: number };

/** 플랫폼·스토어를 합쳐 코드별로 하나씩. 최신 코드가 먼저. 이름은 사용자가 가장 많은 쪽을 쓴다. */
export function versionOptions(versions: FeatureFlagVersionUsage[]): VersionOption[] {
  const byCode = new Map<number, VersionOption & { nameUsers: number }>();
  for (const v of versions) {
    const current = byCode.get(v.versionCode);
    if (!current) {
      byCode.set(v.versionCode, { code: v.versionCode, name: v.versionName, users: v.users, nameUsers: v.users });
      continue;
    }
    current.users += v.users;
    if (v.users > current.nameUsers) {
      current.name = v.versionName;
      current.nameUsers = v.users;
    }
  }
  return Array.from(byCode.values())
    .map(({ code, name, users }) => ({ code, name, users }))
    .sort((a, b) => b.code - a.code);
}

export function formatVersion(code: number, options: VersionOption[]): string {
  const known = options.find((o) => o.code === code);
  return known ? `${known.name} (${code})` : `코드 ${code}`;
}

const PLATFORM_LABEL: Record<FeatureFlagPlatform, string> = { ios: 'iOS', android: 'Android' };
const SEGMENT_ORDER = ['ios|global', 'ios|huawei', 'android|global', 'android|huawei'];

export type SegmentSummary = {
  id: string;
  label: string;
  latest: { code: number; name: string };
  latestUsers: number;
  users: number;
};

export function segmentSummaries(versions: FeatureFlagVersionUsage[]): SegmentSummary[] {
  const segments = new Map<string, SegmentSummary>();
  for (const v of versions) {
    const id = `${v.platform}|${v.flavor}`;
    const current = segments.get(id);
    if (!current) {
      segments.set(id, {
        id,
        label: segmentLabel(v.platform, v.flavor),
        latest: { code: v.versionCode, name: v.versionName },
        latestUsers: v.users,
        users: v.users,
      });
      continue;
    }
    current.users += v.users;
    if (v.versionCode > current.latest.code) {
      current.latest = { code: v.versionCode, name: v.versionName };
      current.latestUsers = v.users;
    } else if (v.versionCode === current.latest.code) {
      current.latestUsers += v.users;
    }
  }
  return Array.from(segments.values()).sort((a, b) => SEGMENT_ORDER.indexOf(a.id) - SEGMENT_ORDER.indexOf(b.id));
}

function segmentLabel(platform: FeatureFlagPlatform, flavor: FeatureFlagFlavor): string {
  return flavor === 'huawei' ? `${PLATFORM_LABEL[platform]} 화웨이` : PLATFORM_LABEL[platform];
}

type AudienceFields = Pick<UpdateFeatureFlagParams, 'platforms' | 'flavors' | 'minVersionCode' | 'maxVersionCode'>;

/** 조건에 맞는 최근 30일 사용자 수. 집계가 없으면 null. 서버 판정(isFeatureOn)과 같은 규칙이다. */
export function audienceReach(
  versions: FeatureFlagVersionUsage[],
  settings: AudienceFields,
): { users: number; total: number } | null {
  let users = 0;
  let total = 0;
  for (const v of versions) {
    total += v.users;
    if (settings.platforms.length && !settings.platforms.includes(v.platform)) continue;
    if (settings.flavors.length && !settings.flavors.includes(v.flavor)) continue;
    if (settings.minVersionCode != null && v.versionCode < settings.minVersionCode) continue;
    if (settings.maxVersionCode != null && v.versionCode > settings.maxVersionCode) continue;
    users += v.users;
  }
  return total ? { users, total } : null;
}
