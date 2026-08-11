import client from './@base';
import { QueryResultWithPagination } from './types';

export type CouponIssueMode = 'INDIVIDUAL' | 'SHARED';
export type CouponStatus = 'SCHEDULED' | 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED';
export type CouponSort = 'RECENT' | 'USAGE' | 'ENDING';

/** Whole-table counts, not the current page — see getCouponSummary on the server. */
export type CouponSummary = {
  active: number;
  endingSoon: number;
  nearlyExhausted: number;
  usedToday: number;
};

export type CouponBatch = {
  batchId: string;
  name: string;
  issueMode: CouponIssueMode;
  code: string | null;
  codeCount: number;
  usedCount: number;
  /** 0 means unlimited. */
  capacity: number;
  status: CouponStatus;
  startAt: string;
  dueAt: string;
  createdAt: string;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

export type CouponCode = {
  codeId: number;
  code: string;
  username: string | null;
  usedAt: string | null;
};

export type CreateCouponParams = {
  name: string;
  issueMode: CouponIssueMode;
  startAt: string;
  dueAt: string;
  count?: number;
  code?: string;
  /** 0 means unlimited. */
  maxUseCount?: number;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

export type UpdateCouponBatchParams = {
  batchId: string;
  name: string;
  startAt: string;
  dueAt: string;
  /** 0 means unlimited. */
  maxUseCount?: number;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

export async function getCoupons(page: number, search?: string, status?: CouponStatus, sort?: CouponSort) {
  const res = await client.get<QueryResultWithPagination<CouponBatch>>('/coupon', {
    params: { page, search: search?.trim() || undefined, status, sort: sort === 'RECENT' ? undefined : sort },
  });

  return res.data;
}

export async function getCouponSummary() {
  const res = await client.get<CouponSummary>('/coupon/summary');

  return res.data;
}

export async function getCouponBatchCodes(batchId: string, page: number, all?: boolean, search?: string) {
  const res = await client.get<QueryResultWithPagination<CouponCode>>(`/coupon/batch/${batchId}/codes`, {
    params: { page, all: all || undefined, search: search?.trim() || undefined },
  });

  return res.data;
}

export async function createCoupon(params: CreateCouponParams) {
  const res = await client.post('/coupon', params);

  return res.data;
}

export async function updateCouponBatch(params: UpdateCouponBatchParams) {
  const { batchId, ...body } = params;
  const res = await client.put(`/coupon/batch/${batchId}`, body);

  return res.data;
}

export async function removeCouponBatch(batchId: string) {
  const res = await client.delete<{ deleted: number; kept: number }>(`/coupon/batch/${batchId}`);

  return res.data;
}

export async function stopCouponBatch(batchId: string) {
  const res = await client.post(`/coupon/batch/${batchId}/stop`);

  return res.data;
}
