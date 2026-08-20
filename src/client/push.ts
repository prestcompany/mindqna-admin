import client from './@base';
import { Locale, QueryResultWithPagination } from './types';

export type AdminPushStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELED' | 'ABORTED';
export type AdminPushTarget = 'ALL' | 'USER';

export type AdminPushItem = {
  id: number;
  title: string;
  message: string;
  link: string | null;
  imgUrl: string | null;
  target: AdminPushTarget;
  locale: Locale | null;
  userNames: string[] | null;
  pushAt: string;
  status: AdminPushStatus;
  targetCount: number | null;
  /** True for broadcasts: an exact count would need an unindexed scan. */
  targetCountIsApproximate: boolean;
  sentCount: number;
  failedCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePushParams = {
  title: string;
  message: string;
  target: AdminPushTarget;
  sendNow: boolean;
  pushAt?: string;
  locale?: Locale;
  userNames?: string[];
  link?: string;
  imgUrl?: string;
};

export type UpdatePushParams = CreatePushParams & { id: number };

/** The server names the usernames it could not find; the form shows them inline. */
export class PushUnknownUserNamesError extends Error {
  constructor(readonly unknownUserNames: string[]) {
    super(`Unknown usernames: ${unknownUserNames.join(', ')}`);
    this.name = 'PushUnknownUserNamesError';
  }
}

function rethrow(error: unknown): never {
  const data = (error as { response?: { data?: { code?: string; unknownUserNames?: string[] } } })?.response?.data;
  if (data?.code === 'PUSH_UNKNOWN_USERNAMES' && data.unknownUserNames) {
    throw new PushUnknownUserNamesError(data.unknownUserNames);
  }
  throw error;
}

export async function getPushes(page: number, locale?: string[], status?: string[]) {
  const res = await client.get<QueryResultWithPagination<AdminPushItem>>('/push', {
    params: { page, locale, status },
  });
  return res.data;
}

export async function getPush(id: number) {
  const res = await client.get<AdminPushItem>(`/push/${id}`);
  return res.data;
}

/** Feeds the compose-time estimate; the admin has no other way to know the size. */
export async function getPushTargetCount(locale: Locale) {
  const res = await client.get<{ count: number; isApproximate: boolean }>('/push/target-count', {
    params: { locale },
  });
  return res.data;
}

export async function createPush(params: CreatePushParams) {
  try {
    const res = await client.post<AdminPushItem>('/push', params);
    return res.data;
  } catch (error) {
    rethrow(error);
  }
}

export async function updatePush({ id, ...body }: UpdatePushParams) {
  try {
    const res = await client.put<AdminPushItem>(`/push/${id}`, body);
    return res.data;
  } catch (error) {
    rethrow(error);
  }
}

export async function cancelPush(id: number) {
  await client.post(`/push/${id}/cancel`);
}

export async function abortPush(id: number) {
  await client.post(`/push/${id}/abort`);
}

export async function removePush(id: number) {
  await client.delete(`/push/${id}`);
}
