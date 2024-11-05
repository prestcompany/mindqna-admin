import client from './@base';
import { BannerLocationType, Locale, QueryResultWithPagination } from './types';

export async function getBanners(page: number, locale?: string[], location?: BannerLocationType[]) {
  const res = await client.get<QueryResultWithPagination<Banner>>('/banner', { params: { page, locale, location } });

  return res.data;
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

export type Banner = {
  id: number;
  location: string;
  name: string;
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
  createdAt: string;
  updatedAt: string;
};

export type CreateBannerParams = {
  location: string;
  name: string;
  img: string;
  link: string;
  locale: Locale;
};

export type UpdateBannerParams = CreateBannerParams & {
  id: number;
  isActive: boolean;
};
