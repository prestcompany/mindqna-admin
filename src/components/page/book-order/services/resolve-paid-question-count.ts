import type { BookOrderIssue, BookOrderIssueCode, BookOrderLevel, BookOrderValidation } from '../../../../client/types';

// Mirrors the server's error-level issue codes (backend evaluate-book-order.ts ISSUE_LEVEL). The
// server re-validates on /books and on confirm, so this recompute only drives the table.
const ERROR_CODES: BookOrderIssueCode[] = [
  'SPACE_ID_MISSING',
  'SPACE_NOT_FOUND',
  'RANGE_INVALID',
  'RANGE_SIZE',
  'COVER_COLOR_MISSING',
  'INCONSISTENT_ROWS',
  'NO_ANSWERED_CARDS',
  'PAID_COUNT_MULTIPLE',
];

const PAID_COUNT_MISMATCH: BookOrderIssue = {
  code: 'PAID_COUNT_MISMATCH',
  message: '결제한 질문 수와 질문 범위가 다릅니다.',
};

function rollUpLevel(issues: BookOrderIssue[]): BookOrderLevel {
  if (issues.some((issue) => ERROR_CODES.includes(issue.code))) return 'error';
  return issues.length > 0 ? 'warning' : 'ok';
}

// Applies the admin's pick for an order whose customer selected several question counts.
export function resolvePaidQuestionCount(order: BookOrderValidation, chosen: number): BookOrderValidation {
  const rangeSize = order.startOrder !== null && order.endOrder !== null ? order.endOrder - order.startOrder + 1 : null;
  const kept = order.issues.filter((issue) => issue.code !== 'PAID_COUNT_MULTIPLE' && issue.code !== 'PAID_COUNT_MISMATCH');
  const issues = rangeSize !== null && chosen !== rangeSize ? [...kept, PAID_COUNT_MISMATCH] : kept;
  return { ...order, paidQuestionCount: chosen, issues, level: rollUpLevel(issues) };
}
