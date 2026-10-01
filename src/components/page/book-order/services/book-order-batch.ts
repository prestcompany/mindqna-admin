import dayjs from 'dayjs';

import type {
  BookBatchRequestOrder,
  BookExportRequestOrder,
  BookOrderBatchItem,
  BookOrderValidation,
} from '../../../../client/types';

// Mirrors the server's BOOK_EXPORT_LIMITS so the form can stop obviously invalid input early.
export const MAX_MANAGER_NAME_LENGTH = 50;
export const MAX_MEMO_LENGTH = 1000;

// Sends the requested range plus confirm-time fields; the server re-validates everything.
export function toBatchRequestOrder(order: BookOrderValidation): BookBatchRequestOrder {
  if (order.startOrder === null || order.endOrder === null) {
    throw new Error(`주문 ${order.orderNo}의 질문 범위가 없습니다.`);
  }
  return {
    orderNo: order.orderNo,
    orderedAt: order.orderedAt,
    spaceId: order.spaceId,
    startOrder: order.startOrder,
    endOrder: order.endOrder,
    coverColor: order.coverColor,
    paidInner: order.paidInner,
    paidQuestionCount: order.paidQuestionCount,
  };
}

// Re-downloads regenerate from current data with the same request the 발주 was confirmed with.
export function batchItemToExportRequest(item: BookOrderBatchItem): BookExportRequestOrder {
  return {
    orderNo: item.orderNo,
    spaceId: item.spaceId,
    startOrder: item.startOrder,
    endOrder: item.endOrder,
    coverColor: item.coverColor,
    paidInner: item.paidInner,
  };
}

export function buildBatchZipName(batchId: number, now: Date): string {
  return `mindbridge-books-batch-${batchId}-${dayjs(now).format('YYYYMMDD-HHmm')}.zip`;
}

export function canConfirmBatch({
  managerName,
  selectedCount,
  isBusy,
}: {
  managerName: string;
  selectedCount: number;
  isBusy: boolean;
}): boolean {
  const name = managerName.trim();
  return !isBusy && selectedCount > 0 && name.length > 0 && name.length <= MAX_MANAGER_NAME_LENGTH;
}
