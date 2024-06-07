import client from "./@base";
import { Locale, QueryResultWithPagination } from "./types";

export async function getPushs(page: number) {
  const res = await client.get<QueryResultWithPagination<AdminPush>>("/push", { params: { page } });

  return res.data;
}

export async function createPush(params: CreatePushParams) {
  const { ...body } = params;

  const res = await client.post("/push", body);

  return res.data;
}

export async function updatePush(params: UpdatePushParams) {
  const { id, ...body } = params;

  const res = await client.put(`/push/${id}`, body);

  return res.data;
}

export async function removePush(id: number) {
  const res = await client.delete(`/push/${id}`);

  return res.data;
}

export type AdminPush = {
  id: number;

  message: string;
  link?: string;
  locale: Locale;
  pushAt: string;

  isActive: boolean;
  isSuccess: boolean;

  createdAt: string;
  updatedAt: string;
};

export type CreatePushParams = {
  message: string;
  pushAt: Date;
  locale: Locale;
};

export type UpdatePushParams = CreatePushParams & {
  id: number;
  isActive: boolean;
};
