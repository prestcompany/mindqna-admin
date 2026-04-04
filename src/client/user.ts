import client from './@base';
import { QueryResultWithPagination, UserDetail, UserSummary } from './types';

export async function getUsers(page: number, locale?: string[]) {
  const res = await client.get<QueryResultWithPagination<UserSummary>>('/user', { params: { page, locale } });

  return res.data;
}

export async function getUser(username: string) {
  const res = await client.get<UserDetail>(`/user/${username}`);

  return res.data;
}

export async function getUserByEmail(email: string) {
  const res = await client.get<UserDetail>(`/user/email/${email}`);

  return res.data;
}

export interface SearchUserParams {
  id?: string;
  username?: string;
  email?: string;
}

export async function searchUser(params: SearchUserParams) {
  const res = await client.get<UserDetail>('/user/search', { params });

  return res.data;
}

export async function removeUser(id: string) {
  const res = await client.delete(`/user/${id}`);

  return res.data;
}

export interface TransferUserParams {
  oldUserName: string;
  newUserName: string;
}

export async function transferUser(params: TransferUserParams) {
  const res = await client.post('/admin/user/transfer', { body: params });

  return res.data;
}
