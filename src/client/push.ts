import client from './@base';
import { Locale, QueryResultWithPagination, SpaceType } from './types';

export type AdminPushStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELED' | 'ABORTED';
export type AdminPushTarget = 'ALL' | 'USER' | 'FILTER';

export type AdminPushItem = {
  id: number;
  title: string;
  message: string;
  link: string | null;
  imgUrl: string | null;
  target: AdminPushTarget;
  locale: Locale | null;
  userNames: string[] | null;
  /** Set only on campaigns saved before target FILTER existed, which were split into rows. */
  groupId: string | null;
  /** The conditions a FILTER push was resolved from; null for every other target. */
  filter: PushTargetFilter | null;
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
  target: 'ALL' | 'USER';
  sendNow: boolean;
  pushAt?: string;
  locale?: Locale;
  userNames?: string[];
  /** Present for a filtered campaign; the server resolves it into one FILTER push and its audience. */
  filter?: PushTargetFilter;
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

/** No user matched the conditions, so there is nothing to save. */
export class PushFilterNoMatchError extends Error {
  constructor() {
    super('No user matches the filter');
    this.name = 'PushFilterNoMatchError';
  }
}

function rethrow(error: unknown): never {
  const data = (error as { response?: { data?: { code?: string; unknownUserNames?: string[] } } })?.response?.data;
  if (data?.code === 'PUSH_UNKNOWN_USERNAMES' && data.unknownUserNames) {
    throw new PushUnknownUserNamesError(data.unknownUserNames);
  }
  if (data?.code === 'PUSH_FILTER_NO_MATCH') throw new PushFilterNoMatchError();
  throw error;
}

export async function getPushes(page: number, locale?: string[], status?: string[]) {
  const res = await client.get<QueryResultWithPagination<AdminPushItem>>('/push', {
    params: { page, locale, status },
  });
  return res.data;
}

export type TestRecipient = {
  username: string;
  provider: string;
  locale: string | null;
  /** The account exists but has no registered device; nothing will arrive. */
  hasToken: boolean;
};

export type ResolvedTestEmail = { email: string; recipients: TestRecipient[] };

export type ResolveTestEmailsResult = {
  resolved: ResolvedTestEmail[];
  /** Addresses with no account. Surfaced rather than dropped — a silent skip looks like a
   *  successful test. */
  unmatched: string[];
  userNames: string[];
};

/**
 * Staff emails to the usernames a test send should target. One address routinely fronts
 * several accounts, so this returns them all rather than picking one.
 */
export async function resolveTestEmails(emails: string[]) {
  const res = await client.post<ResolveTestEmailsResult>('/push/resolve-test-emails', { emails });
  return res.data;
}

/** Feeds the compose-time estimate; the admin has no other way to know the size. */
export async function getPushTargetCount(locale: Locale) {
  const res = await client.get<{ count: number; isApproximate: boolean }>('/push/target-count', {
    params: { locale },
  });
  return res.data;
}

/**
 * Narrows an audience by the properties of the space a user belongs to.
 *
 * Every field is optional and an omitted one drops its condition, but at least one must be
 * present — the server refuses an empty filter rather than quietly resolving to everybody.
 */
export type PushTargetFilter = {
  spaceTypes?: SpaceType[];
  /** The SPACE's language, which is not the same as the user's app language. */
  spaceLocales?: Locale[];
  minCardCount?: number;
  /** At most this many questions; with minCardCount it is a range. */
  maxCardCount?: number;
  minPetLevel?: number;
};

/** Count only. The names are resolved again when the campaign is saved. */
export async function previewPushTargets(filter: PushTargetFilter & { locale?: Locale }) {
  const res = await client.post<{ count: number; isApproximate: boolean }>('/push/preview-targets', filter);
  return res.data;
}

/** Returns a list of one. Kept as a list so the response shape did not change when filtered campaigns stopped being split into rows. */
export async function createPush(params: CreatePushParams) {
  try {
    const res = await client.post<AdminPushItem[]>('/push', params);
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
