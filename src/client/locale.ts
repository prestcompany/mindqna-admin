import client from './@base';
import { CreateLocaleParams, LocaleWord, QueryResultWithPagination } from './types';

export async function getLocales(page: number, locale?: string[], key?: string, value?: string) {
  const res = await client.get<QueryResultWithPagination<LocaleWord>>('/locale', { params: { page, locale, key, value } });

  return res.data;
}

export async function createLocale(params: CreateLocaleParams) {
  const { ...body } = params;

  const res = await client.post('/locale', body);

  return res.data;
}

export async function updateLocale(params: CreateLocaleParams & { id: number }) {
  const { id, ...body } = params;

  const res = await client.put(`/locale/${id}`, body);

  return res.data;
}

export async function removeLocale(id: number) {
  const res = await client.delete(`/locale/${id}`);

  return res.data;
}
