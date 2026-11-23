import { toErrorMessage } from '@/lib/error-message';

/** 서버 SaveSandboxTesterParams.memo 의 최대 길이. */
export const MEMO_MAX = 191;

type Draft = { userId: string; memo: string };

/** 넣기 전에 막을 문제. 메모는 서버가 빈 값을 받지만 누구인지 남기도록 화면에서 필수로 둔다. */
export function sandboxTesterProblems(draft: Draft): string[] {
  const { userId, memo } = toSaveInput(draft);
  const problems: string[] = [];
  if (!userId) problems.push('userId 를 입력하세요.');
  if (!memo) problems.push('메모를 입력하세요.');
  else if (memo.length > MEMO_MAX) problems.push(`메모는 ${MEMO_MAX}자까지입니다.`);
  return problems;
}

export function toSaveInput(draft: Draft): Draft {
  return { userId: draft.userId.trim(), memo: draft.memo.trim() };
}

/** 저장 실패 문구. 없는 사용자는 404 로 온다. */
export function saveErrorMessage(err: unknown): string {
  if ((err as { response?: { status?: unknown } })?.response?.status === 404) return '그 userId 의 사용자가 없습니다.';
  return toErrorMessage(err);
}
