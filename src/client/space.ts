import client from './@base';
import { QueryResultWithPagination, Space, SpaceDetail, SpaceType } from './types';

export type SpaceOrderBy =
  | 'card'
  | 'replies'
  | 'members'
  | 'heart'
  | 'star'
  | 'exp'
  | 'roomCount'
  | 'interiorCount';

export type SearchSpacesParams = {
  page: number;
  spaceId?: string;
  name?: string;
  username?: string;
  nickname?: string;
  type?: SpaceType;
  locale?: string;
  startDate?: string;
  endDate?: string;
};

export type SearchSpacesResult = QueryResultWithPagination<Space> & {
  totalCount: number;
};

export async function getSpaces(
  page: number,
  type?: SpaceType[],
  locale?: string[],
  orderBy?: SpaceOrderBy,
) {
  const res = await client.get<QueryResultWithPagination<Space>>('/space', { params: { page, type, locale, orderBy } });

  return res.data;
}

export async function getSpace(id: string) {
  const res = await client.get<SpaceDetail>(`/space/${id}`);

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

export async function searchSpaces(by: SearchSpacesParams) {
  const res = await client.get<SearchSpacesResult>(`/space/search`, { params: by });

  return res.data;
}
