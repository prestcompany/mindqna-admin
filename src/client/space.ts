import client from './@base';
import { QueryResultWithPagination, Space, SpaceType } from './types';

export async function getSpaces(
  page: number,
  type?: SpaceType[],
  locale?: string[],
  orderBy?: 'card' | 'replies' | 'level' | 'members',
) {
  const res = await client.get<QueryResultWithPagination<Space>>('/space', { params: { page, type, locale, orderBy } });

  return res.data;
}

export async function getSpace(id: string) {
  const res = await client.get(`/space/${id}`);

  return res.data;
}

export async function removeSpace(id: string) {
  const res = await client.delete(`/space/${id}`);

  return res.data;
}

export async function removeProfile(id: string) {
  const res = await client.delete(`/profile/${id}`);

  return res.data;
}

export async function searchSpaces(by: { spaceId: string; username: string }) {
  const res = await client.get<Space[]>(`/space/search`, { params: by });

  return res.data;
}
