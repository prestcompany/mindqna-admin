import type { TransferLeftoverParams, TransferLeftoverResult } from '@/client/types';
import { toErrorMessage } from '@/lib/error-message';

const TEMP_PREFIX = 'temp_';

export function leftoverProblems(draft: TransferLeftoverParams): string[] {
  const from = draft.fromUserName.trim();
  if (!from) return ['정리할 temp_ 계정을 입력하세요.'];
  if (!from.startsWith(TEMP_PREFIX)) return ['temp_ 로 시작하는 계정만 정리할 수 있습니다.'];
  if (from === draft.toUserName.trim()) return ['같은 계정으로는 정리할 수 없습니다.'];
  return [];
}

export function toLeftoverBody(draft: TransferLeftoverParams): TransferLeftoverParams {
  return { fromUserName: draft.fromUserName.trim(), toUserName: draft.toUserName.trim() };
}

export function leftoverSummary(result: TransferLeftoverResult): string[] {
  const clubs = result.deactivatedClubs;
  return [
    `구매 원장 ${result.ledgerRows}건을 이 계정으로 옮겼습니다.`,
    `건너뛴 티켓 원장 ${result.skippedTicketLedgers}건`,
    clubs.length ? `중복 골드클럽 정리: ${clubs.length}건 비활성(id ${clubs.join(', ')})` : '중복 골드클럽 정리: 없음',
  ];
}

/** 404 는 어느 한쪽 사용자가 없을 때. 400 은 서버 문구를 그대로 보인다. */
export function leftoverErrorMessage(err: unknown): string {
  if ((err as { response?: { status?: unknown } })?.response?.status === 404) return '사용자를 찾지 못했습니다.';
  return toErrorMessage(err);
}
