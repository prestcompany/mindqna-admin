import client from './@base';
import { Locale, QueryResultWithPagination } from './types';

export type GetBannersParams = {
  page: number;
  locale?: string[];
  location?: string[];
  search?: string;
};

export async function getBanners({ page, locale, location, search }: GetBannersParams) {
  const res = await client.get<QueryResultWithPagination<Banner>>('/banner', {
    params: { page, locale, location, search: search?.trim() || undefined },
  });

  return res.data;
}

// Backend-driven exposure-location registry (registry ∪ in-use DB locations).
// Source of truth for the admin banner location dropdown/labels — see banner-location.const.ts.
export type BannerLocation = {
  key: string;
  label: string;
  description?: string;
  registered: boolean;
};

export async function getBannerLocations(): Promise<BannerLocation[]> {
  // Backend currently wraps the array as `{ items }` (admin.controller.ts), but tolerate a bare
  // array too so the dropdown survives either response shape.
  const res = await client.get<{ items: BannerLocation[] } | BannerLocation[]>('/banner/locations');
  const data = res.data as { items?: BannerLocation[] } | BannerLocation[];

  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function createBanner(params: CreateBannerParams) {
  const { ...body } = params;

  const res = await client.post('/banner', body);

  return res.data;
}

export async function updateBanner(params: UpdateBannerParams) {
  const { id, ...body } = params;

  const res = await client.put(`/banner/${id}`, body);

  return res.data;
}

export async function removeBanner(id: number) {
  const res = await client.delete(`/banner/${id}`);

  return res.data;
}

/** `from`/`to` are KST calendar days (`YYYY-MM-DD`), inclusive, at most 366 days apart. */
export async function getBannerStats(id: number, params: { from: string; to: string }) {
  const res = await client.get<BannerStats>(`/banner/${id}/stats`, { params });

  return res.data;
}

export type Banner = {
  id: number;
  location: string;
  name: string;
  orderIndex: number;
  title?: string;
  desc1?: string;
  desc2?: string;
  iconUri?: string;
  imgUri?: string;
  viewCount: number;
  clickCount: number;
  link: string;
  reward: number;
  isPaid: boolean;
  isOnce: boolean;
  locale: Locale;
  isActive: boolean;
  /** Publish window, ISO UTC. Null on either side means no limit there. */
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BannerStatsDay = {
  /** KST day, `YYYY-MM-DD`. */
  date: string;
  views: number;
  clicks: number;
  /** clicks / views as a ratio (0.0123 = 1.23%); null when there were no views. */
  ctr: number | null;
  claims: number;
};

export type BannerStats = {
  bannerId: number;
  from: string;
  to: string;
  /** First day daily views/clicks were recorded. Claims have history before it. */
  statsSince: string | null;
  totals: Omit<BannerStatsDay, 'date'>;
  /** Every day of the range, zero-filled. */
  days: BannerStatsDay[];
};

export type CreateBannerParams = {
  location: string;
  name: string;
  img: string;
  link: string;
  locale: Locale;
  orderIndex: number;
  /** ISO UTC, or null for no limit. */
  startAt: string | null;
  endAt: string | null;
};

export type UpdateBannerParams = CreateBannerParams & {
  id: number;
  isActive: boolean;
};
