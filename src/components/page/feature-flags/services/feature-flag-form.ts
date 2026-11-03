import type {
  FeatureFlagAppDefault,
  FeatureFlagFlavor,
  FeatureFlagItem,
  FeatureFlagPlatform,
  FeatureFlagRow,
  UpdateFeatureFlagParams,
} from '@/client/types';
import { z } from 'zod';

// 서버 컬럼이 INT 라 이보다 큰 versionCode 는 서버가 400 으로 막는다.
const MAX_VERSION_CODE = 2147483647;
const DESCRIPTION_MAX_LENGTH = 191;

export const APP_DEFAULT_LABEL: Record<FeatureFlagAppDefault, string> = {
  on: '켬',
  off: '끔',
  env: '빌드 설정',
};

const PLATFORM_LABEL: Record<FeatureFlagPlatform, string> = { ios: 'iOS', android: 'Android' };

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
    message: '1 이상의 정수를 입력하거나 비워 두세요.',
  });

const featureFlagFieldsSchema = z.object({
  description: z.string().max(DESCRIPTION_MAX_LENGTH, `설명은 ${DESCRIPTION_MAX_LENGTH}자까지 쓸 수 있습니다.`),
  platform: z.enum(['all', 'ios', 'android']),
  flavor: z.enum(['all', 'global', 'huawei']),
  minVersionCode: versionCodeField,
  maxVersionCode: versionCodeField,
});

const isVersionRangeOrdered = (v: Pick<FeatureFlagFormValues, 'minVersionCode' | 'maxVersionCode'>) =>
  v.minVersionCode === '' || v.maxVersionCode === '' || Number(v.minVersionCode) <= Number(v.maxVersionCode);

const VERSION_RANGE_ISSUE = { path: ['maxVersionCode'], message: '최소 버전이 최대 버전보다 클 수 없습니다.' };

export const featureFlagFormSchema = featureFlagFieldsSchema.refine(isVersionRangeOrdered, VERSION_RANGE_ISSUE);

// 서버 행이 아직 없는 키를 편집하면 행을 새로 만든다. 그때만 켬/끔을 같이 정한다.
export const featureFlagCreateSchema = featureFlagFieldsSchema
  .extend({
    enabled: z.boolean({ invalid_type_error: '켬/끔을 골라 주세요.', required_error: '켬/끔을 골라 주세요.' }),
  })
  .refine(isVersionRangeOrdered, VERSION_RANGE_ISSUE);

export type FeatureFlagCreateValues = FeatureFlagFormValues & { enabled: boolean | null };

// 비었거나 가능한 값을 모두 담은 배열은 "전체"와 같은 뜻이다.
function toSingle<T extends string>(values: T[], all: readonly T[]): 'all' | T {
  return values.length === 1 && all.includes(values[0]) ? values[0] : 'all';
}

export function toFormValues(row: FeatureFlagRow | null): FeatureFlagFormValues {
  return {
    description: row?.description ?? '',
    platform: toSingle(row?.platforms ?? [], ['ios', 'android'] as const),
    flavor: toSingle(row?.flavors ?? [], ['global', 'huawei'] as const),
    minVersionCode: row?.minVersionCode == null ? '' : String(row.minVersionCode),
    maxVersionCode: row?.maxVersionCode == null ? '' : String(row.maxVersionCode),
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

export function toToggleParams(item: FeatureFlagItem, enabled: boolean): UpdateFeatureFlagParams {
  const { row } = item;
  return {
    enabled,
    platforms: row?.platforms ?? [],
    flavors: row?.flavors ?? [],
    minVersionCode: row?.minVersionCode ?? null,
    maxVersionCode: row?.maxVersionCode ?? null,
    description: row?.description ?? '',
  };
}

// 새 행은 앱 기본값으로 채워 저장해도 앱 동작이 바뀌지 않게 한다. 빌드 설정 키는 서버가 값을 몰라 직접 고르게 한다.
export function initialEnabled(item: FeatureFlagItem): boolean | null {
  if (item.row) return item.row.enabled;
  if (item.appDefault === 'env') return null;
  return item.appDefault === 'on';
}

export function displayEnabled(item: FeatureFlagItem): boolean {
  return item.row ? item.row.enabled : item.appDefault === 'on';
}

export function summarizeConditions(
  row: Pick<FeatureFlagRow, 'platforms' | 'flavors' | 'minVersionCode' | 'maxVersionCode'>,
): string {
  const platforms = row.platforms.length ? row.platforms.map((p) => PLATFORM_LABEL[p] ?? p).join('·') : '전체 플랫폼';
  const flavors = row.flavors.length ? row.flavors.join('·') : '전체 flavor';
  const { minVersionCode: min, maxVersionCode: max } = row;
  const versions =
    min != null && max != null
      ? `${min}–${max}`
      : min != null
        ? `${min} 이상`
        : max != null
          ? `${max} 이하`
          : '버전 제한 없음';
  return `${platforms} · ${flavors} · ${versions}`;
}

// 서버 400 은 typia 형식 오류와 규칙 오류 두 모양이지만 둘 다 message 를 담는다.
export function toErrorMessage(err: unknown): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string' && message) return message;
  if (err instanceof Error) return err.message;
  return String(err);
}
