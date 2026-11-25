import type {
  FeatureFlagFlavor,
  FeatureFlagItem,
  FeatureFlagPlatform,
  FeatureFlagsResult,
  UpdateFeatureFlagParams,
} from '@/client/types';
import { z } from 'zod';
import { formatVersion, type VersionOption } from './app-versions';

// 서버 컬럼이 INT 라 이보다 큰 버전 코드는 서버가 400 으로 막는다.
const MAX_VERSION_CODE = 2147483647;
const DESCRIPTION_MAX_LENGTH = 191;

export type FeatureFlagSettings = UpdateFeatureFlagParams;
type AudienceFields = Pick<FeatureFlagSettings, 'platforms' | 'flavors' | 'minVersionCode' | 'maxVersionCode'>;

// 서버 행이 없을 때 앱이 실제로 쓰는 값. 빌드 설정 키는 일반 빌드 env 에만 'on' 이 있고 화웨이 빌드에는 없다.
export function effectiveSettings(item: FeatureFlagItem): FeatureFlagSettings {
  const { row } = item;
  if (row) {
    return {
      enabled: row.enabled,
      platforms: row.platforms,
      flavors: row.flavors,
      minVersionCode: row.minVersionCode,
      maxVersionCode: row.maxVersionCode,
      description: row.description,
    };
  }
  return {
    enabled: item.appDefault !== 'off',
    platforms: [],
    flavors: item.appDefault === 'env' ? ['global'] : [],
    minVersionCode: null,
    maxVersionCode: null,
    description: '',
  };
}

export function displayEnabled(item: FeatureFlagItem): boolean {
  return effectiveSettings(item).enabled;
}

export function toToggleParams(item: FeatureFlagItem, enabled: boolean): UpdateFeatureFlagParams {
  return { ...effectiveSettings(item), enabled };
}

// 서버 라벨의 "설정 > 기타 > 쿠폰" 경로와 괄호 메모를 이름에서 떼어 보조 줄로 내린다.
export function splitLabel(label: string): { name: string; hint: string | null } {
  let name = label.trim();
  const hints: string[] = [];
  const paren = name.match(/^(.*?)\s*\((.+)\)$/);
  if (paren) {
    name = paren[1];
    hints.push(paren[2]);
  }
  const path = name.split(/\s*>\s*/);
  if (path.length > 1) {
    name = path[path.length - 1];
    hints.unshift(path.slice(0, -1).join(' > '));
  }
  return { name, hint: hints.length ? hints.join(' · ') : null };
}

const SECTION_TITLE: Record<string, string> = {
  wallet: '지갑',
  ads: '광고',
  archive: '보관하기',
  square: '광장',
  space: '공간',
  etc: '기타',
};

export type FeatureFlagGroup = { id: string; title: string; items: FeatureFlagItem[] };

export function groupFlags(items: FeatureFlagItem[]): FeatureFlagGroup[] {
  const groups = new Map<string, FeatureFlagGroup>();
  for (const item of items) {
    const prefix = item.key.split('.')[0];
    const id = prefix in SECTION_TITLE ? prefix : 'etc';
    const group = groups.get(id) ?? { id, title: SECTION_TITLE[id], items: [] };
    group.items.push(item);
    groups.set(id, group);
  }
  return Array.from(groups.values());
}

const PLATFORM_LABEL: Record<FeatureFlagPlatform, string> = { ios: 'iOS만', android: 'Android만' };
const FLAVOR_LABEL: Record<FeatureFlagFlavor, string> = { global: '화웨이 제외', huawei: '화웨이만' };

// 제한이 없으면 null. 목록에는 제한이 걸린 기능만 표시한다. 버전 목록을 주면 코드 대신 버전 이름으로 쓴다.
export function describeAudience(settings: AudienceFields, versions?: VersionOption[]): string | null {
  const parts: string[] = [];
  if (settings.platforms.length === 1) parts.push(PLATFORM_LABEL[settings.platforms[0]]);
  if (settings.flavors.length === 1) parts.push(FLAVOR_LABEL[settings.flavors[0]]);
  const { minVersionCode: min, maxVersionCode: max } = settings;
  const label = (code: number) => (versions ? formatVersion(code, versions) : `버전 코드 ${code}`);
  if (min != null && max != null) parts.push(versions ? `${label(min)} – ${label(max)}` : `버전 코드 ${min}–${max}`);
  else if (min != null) parts.push(`${label(min)} 이상`);
  else if (max != null) parts.push(`${label(max)} 이하`);
  return parts.length ? parts.join(' · ') : null;
}

export type FeatureFlagFormValues = {
  description: string;
  platform: 'all' | FeatureFlagPlatform;
  flavor: 'all' | FeatureFlagFlavor;
  minVersionCode: string;
  maxVersionCode: string;
};

const versionCodeField = z
  .string()
  .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= MAX_VERSION_CODE), {
    message: '1 이상의 숫자만 입력할 수 있습니다.',
  });

export const featureFlagFormSchema = z
  .object({
    // 저장할 때 앞뒤 공백을 지우므로 지운 뒤 길이로 잰다.
    description: z
      .string()
      .refine((v) => v.trim().length <= DESCRIPTION_MAX_LENGTH, `${DESCRIPTION_MAX_LENGTH}자까지 쓸 수 있습니다.`),
    platform: z.enum(['all', 'ios', 'android']),
    flavor: z.enum(['all', 'global', 'huawei']),
    minVersionCode: versionCodeField,
    maxVersionCode: versionCodeField,
  })
  .refine(
    (v) => v.minVersionCode === '' || v.maxVersionCode === '' || Number(v.minVersionCode) <= Number(v.maxVersionCode),
    { path: ['maxVersionCode'], message: '시작 값보다 작을 수 없습니다.' },
  );

// 비었거나 가능한 값을 모두 담은 배열은 "전체"와 같은 뜻이다.
function toSingle<T extends string>(values: T[], all: readonly T[]): 'all' | T {
  return values.length === 1 && all.includes(values[0]) ? values[0] : 'all';
}

export function toFormValues(item: FeatureFlagItem): FeatureFlagFormValues {
  const settings = effectiveSettings(item);
  return {
    description: settings.description,
    platform: toSingle(settings.platforms, ['ios', 'android'] as const),
    flavor: toSingle(settings.flavors, ['global', 'huawei'] as const),
    minVersionCode: settings.minVersionCode == null ? '' : String(settings.minVersionCode),
    maxVersionCode: settings.maxVersionCode == null ? '' : String(settings.maxVersionCode),
  };
}

export function toUpdateParams(values: FeatureFlagFormValues, enabled: boolean): UpdateFeatureFlagParams {
  return {
    enabled,
    platforms: values.platform === 'all' ? [] : [values.platform],
    flavors: values.flavor === 'all' ? [] : [values.flavor],
    minVersionCode: values.minVersionCode === '' ? null : Number(values.minVersionCode),
    maxVersionCode: values.maxVersionCode === '' ? null : Number(values.maxVersionCode),
    description: values.description.trim(),
  };
}

export { toErrorMessage } from '@/lib/error-message';

// 켬/끔과 대상 저장이 같은 키를 쓴다. 진행 중인 PUT 이 있는 기능은 모두 막는다.
export const FEATURE_FLAG_PUT_KEY = ['feature-flag-put'];

export type FeatureFlagPutVariables = { key: string };

export function busyFlagKeys(variables: unknown[]): Set<string> {
  const keys = new Set<string>();
  for (const v of variables) {
    const key = (v as Partial<FeatureFlagPutVariables> | undefined)?.key;
    if (typeof key === 'string') keys.add(key);
  }
  return keys;
}

// 대상 설정 창은 연 순간의 item 을 들고 있다. 그사이 다른 탭에서 끈 기능을 다시 켜지 않게 최신 목록 값을 쓴다.
export function currentEnabled(latest: FeatureFlagsResult | undefined, item: FeatureFlagItem): boolean {
  return displayEnabled(latest?.items.find((i) => i.key === item.key) ?? item);
}
