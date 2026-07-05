import dayjs from 'dayjs';

// 이 이전 결제건은 isSuccess 미기록 → 성공으로 간주(레거시 데이터 보정)
export const LEGACY_SUCCESS_BEFORE = '2024-06-01';

export type PurchaseStatusDotVariant = 'dotSuccess' | 'dotDanger' | 'dotNeutral';

export function resolveStatus(record: { isExpired: boolean; isSuccess: boolean; createdAt: string }): {
  label: string;
  variant: 'softSuccess' | 'softDanger' | 'softNeutral';
  dotVariant: PurchaseStatusDotVariant;
} {
  if (record.isExpired) return { label: '만료', variant: 'softNeutral', dotVariant: 'dotNeutral' };
  const isSuccess = record.isSuccess || dayjs(record.createdAt).isBefore(LEGACY_SUCCESS_BEFORE);
  return isSuccess
    ? { label: '성공', variant: 'softSuccess', dotVariant: 'dotSuccess' }
    : { label: '실패', variant: 'softDanger', dotVariant: 'dotDanger' };
}
