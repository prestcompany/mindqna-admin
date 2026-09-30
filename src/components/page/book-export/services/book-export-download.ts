import dayjs from 'dayjs';

import type { BookExportRequestOrder, BookOrderLevel, BookOrderValidation } from '../../../../client/types';

export const BOOKS_PER_REQUEST = 20;

export function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

export function isSelectableOrder(order: BookOrderValidation): boolean {
  return order.level !== 'error';
}

// Sends the requested range; the server re-validates and applies the clamp/trim itself.
export function toBookExportRequest(order: BookOrderValidation): BookExportRequestOrder {
  if (order.startOrder === null || order.endOrder === null) {
    throw new Error(`주문 ${order.orderNo}의 질문 범위가 없습니다.`);
  }
  return {
    orderNo: order.orderNo,
    spaceId: order.spaceId,
    startOrder: order.startOrder,
    endOrder: order.endOrder,
    coverColor: order.coverColor,
    paidInner: order.paidInner,
  };
}

export function countOrdersByLevel(orders: BookOrderValidation[]): Record<'all' | BookOrderLevel, number> {
  const counts = { all: orders.length, ok: 0, warning: 0, error: 0 };
  orders.forEach((order) => {
    counts[order.level] += 1;
  });
  return counts;
}

export function buildBookZipName(now: Date): string {
  return `mindbridge-books-${dayjs(now).format('YYYYMMDD-HHmm')}.zip`;
}

// Header "select all" acts on the currently visible (filtered) selectable rows only, so it never
// touches rows the operator can't currently see.
export function toggleVisibleSelection({
  selected,
  visibleSelectable,
  checked,
}: {
  selected: Set<string>;
  visibleSelectable: string[];
  checked: boolean;
}): Set<string> {
  const next = new Set(selected);
  if (checked) visibleSelectable.forEach((orderNo) => next.add(orderNo));
  else visibleSelectable.forEach((orderNo) => next.delete(orderNo));
  return next;
}

export function areAllVisibleSelected({
  selected,
  visibleSelectable,
}: {
  selected: Set<string>;
  visibleSelectable: string[];
}): boolean {
  return visibleSelectable.length > 0 && visibleSelectable.every((orderNo) => selected.has(orderNo));
}
