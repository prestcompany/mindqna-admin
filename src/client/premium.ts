import client from './@base';
import {
  GiveCoinBulkParams,
  GiveCoinBulkResult,
  GiveCoinParams,
  GiveTicketParams,
  PurchaseMeta,
  PurchaseDetail,
  QueryResultWithPagination,
  RevokeTicketParams,
} from './types';

export async function getPurchases(by: {
  page: number;
  username?: string;
  startDate?: string;
  endDate?: string;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  status?: 'success' | 'failed' | 'expired';
  isProduction?: boolean;
}) {
  const res = await client.get<QueryResultWithPagination<PurchaseMeta>>('/purchase', { params: by });

  return res.data;
}

export type GetProductsFilters = {
  page: number;
  search?: string;
  isActive?: boolean;
  platform?: 'IOS' | 'AOS' | 'EVENT';
  isProduction?: boolean;
  isSubscribe?: boolean;
};

export async function getProducts(by: GetProductsFilters) {
  const res = await client.get<QueryResultWithPagination<IAPProduct>>('/products', { params: by });

  return res.data;
}

export async function getPurchaseDetail(id: number) {
  const res = await client.get<PurchaseDetail>(`/purchase/${id}`);

  return res.data;
}

export async function giveTicket(params: GiveTicketParams) {
  const { ...body } = params;

  const res = await client.post('/ticket', body);

  return res.data;
}

export async function revokeTicket(params: RevokeTicketParams) {
  const { ...body } = params;

  const res = await client.post('/ticket/revoke', body);

  return res.data;
}

export async function giveCoin(params: GiveCoinParams) {
  const { ...body } = params;

  const res = await client.post('/coin', body);

  return res.data;
}

export async function giveCoinBulk(params: GiveCoinBulkParams) {
  const { ...body } = params;

  const res = await client.post<GiveCoinBulkResult>('/coin/bulk', body);

  return res.data;
}

export type IAPProduct = {
  id: number;
  owner: {
    username: string;
  };
  profileId: string;
  platform: string;
  productId: string;
  transactionId: string;
  dueAt?: string;
  isActive: boolean;
  isProduction: boolean;
  createdAt: string;
  updatedAt: string;
};
