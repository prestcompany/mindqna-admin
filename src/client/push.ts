import client from './@base';
import { Locale, QueryResultWithPagination } from './types';

export async function getPushes(page: number, locale?: string[]) {
  const res = await client.get<QueryResultWithPagination<AdminPush>>('/push', { params: { page, locale } });

  return res.data;
}

export async function createPush(params: CreatePushParams) {
  const { ...body } = params;

  console.log('body', body);
  const res = await client.post('/push', body);

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

  title: string;
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
  title: string;
  message: string;
  pushAt: string;
  locale: Locale;
  target: 'ALL' | 'USER';
  userNames?: string[];
  isActive: boolean;
};

export type UpdatePushParams = CreatePushParams & {
  id: string;
  isActive: boolean;
};
