import type { RebindOutcome, RebindPlatform, SubscriptionRebindParams, UserProfileRow } from '@/client/types';
import { toErrorMessage } from '@/lib/error-message';

export type RebindDraft = { platform: RebindPlatform | null; transactionId: string; spaceId: string };

/** 지급할 수 있는 공간: 서버처럼 꺼지거나 지워지지 않은 프로필이 있는 공간만. */
export function rebindableSpaces(profiles: UserProfileRow[]): { spaceId: string; label: string }[] {
  return profiles
    .filter((p) => p.spaceId && !p.disabled && !p.removed)
    .map((p) => ({ spaceId: p.spaceId as string, label: p.spaceName ?? (p.spaceId as string) }));
}

export function rebindProblems(draft: RebindDraft): string[] {
  const problems: string[] = [];
  if (!draft.platform) problems.push('플랫폼을 고르세요.');
  if (!draft.transactionId.trim()) problems.push('거래 id 를 입력하세요.');
  if (!draft.spaceId) problems.push('공간을 고르세요.');
  return problems;
}

/** rebindProblems 가 빈 뒤에만 부른다. */
export function toRebindBody(draft: RebindDraft): SubscriptionRebindParams {
  return {
    platform: draft.platform as RebindPlatform,
    transactionId: draft.transactionId.trim(),
    spaceId: draft.spaceId,
  };
}

/** 404·403 은 서버 문구가 짧아 풀어 쓰고, 400(code 16)은 서버 문구를 그대로 보인다. */
export function rebindErrorMessage(err: unknown): string {
  const status = (err as { response?: { status?: unknown } })?.response?.status;
  if (status === 404) return '사용자나 그 거래 기록을 찾지 못했습니다.';
  if (status === 403) return '이 사용자는 고른 공간의 활동 중인 멤버가 아닙니다.';
  return toErrorMessage(err);
}

const OUTCOME_LABEL: Record<RebindOutcome, string> = {
  created: '새로 지급했습니다.',
  reactivated: '끊겼던 권한을 다시 살렸습니다.',
  extended: '권한 기간을 늘렸습니다.',
  noop: '이미 지급된 상태라 바뀐 것이 없습니다.',
};

export function rebindOutcomeLabel(outcome: RebindOutcome): string {
  return OUTCOME_LABEL[outcome] ?? outcome;
}
