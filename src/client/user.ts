import client from './@base';
import { QueryResultWithPagination, User } from './types';

export async function getUsers(page: number, locale?: string[]) {
  const res = await client.get<QueryResultWithPagination<User>>('/user', { params: { page, locale } });

  return res.data;
}

export async function getUser(username: string) {
  const res = await client.get<User>(`/user/${username}`);

  return res.data;
}

export async function removeUser(id: string) {
  const res = await client.delete(`/user/${id}`);

  return res.data;
}
