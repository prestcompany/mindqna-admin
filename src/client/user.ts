import client from './@base';
import {
  LiveSubscriptionRow,
  QueryResultWithPagination,
  UserAccessRow,
  UserDetail,
  UserEntitlements,
  UserProfileRow,
  UserPurchaseRow,
  UserPushRow,
  UpdateUserParams,
  UserSummary,
  UserTabPageResult,
} from './types';

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
  const res = await client.post('/user/transfer', params);

  return res.data;
}

export async function getUserProfiles(username: string) {
  const res = await client.get<UserProfileRow[]>(`/user/${username}/profiles`);

  return res.data;
}

export async function getUserPurchases(username: string, page: number) {
  const res = await client.get<UserTabPageResult<UserPurchaseRow>>(`/user/${username}/purchases`, { params: { page } });

  return res.data;
}

export async function getUserEntitlements(username: string) {
  const res = await client.get<UserEntitlements>(`/user/${username}/entitlements`);

  return res.data;
}

export async function getUserAccess(username: string, page: number) {
  const res = await client.get<UserTabPageResult<UserAccessRow>>(`/user/${username}/access`, { params: { page } });

  return res.data;
}

export async function getUserPushes(username: string, page: number) {
  const res = await client.get<UserTabPageResult<UserPushRow>>(`/user/${username}/pushes`, { params: { page } });

  return res.data;
}

export async function getUserSubscriptionStatus(username: string) {
  const res = await client.get<LiveSubscriptionRow[]>(`/user/${username}/subscription-status`);

  return res.data;
}

export async function updateUser(username: string, body: UpdateUserParams) {
  const res = await client.put(`/user/${username}`, body);

  return res.data;
}
