import client from "./@base";
import { QueryResultWithPagination } from "./types";

export async function getCoupons(page: number) {
  const res = await client.get<QueryResultWithPagination<Coupon>>("/coupon", { params: { page } });

  return res.data;
}

export async function createCoupon(params: CreateCouponParams) {
  const { ...body } = params;

  const res = await client.post("/coupon", body);

  return res.data;
}

export async function updateCoupon(params: UpdateCouponParams) {
  const { id, ...body } = params;

  const res = await client.put(`/coupon/${id}`, body);

  return res.data;
}

export async function removeCoupon(id: number) {
  const res = await client.delete(`/coupon/${id}`);

  return res.data;
}

export type Coupon = {
  id: number;
  name: string;
  code: string;
  dueAt: string;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
  createdAt: string;

  username?: string;
};

export type CreateCouponParams = {
  count: number;
  name: string;
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
  dueAt: string;
};

export type UpdateCouponParams = CreateCouponParams & {
  id: number;
};
