import client from "./@base";
import { GiveCoinParams, GiveTicketParams, PurchaseMeta, QueryResultWithPagination } from "./types";

export async function getPruchases(by: { page: number }) {
  const res = await client.get<QueryResultWithPagination<PurchaseMeta>>("/purchase", { params: by });

  return res.data;
}

export async function getProducts(by: { page: number }) {
  const res = await client.get<QueryResultWithPagination<IAPProduct>>("/products", { params: by });

  return res.data;
}

export async function giveTicket(params: GiveTicketParams) {
  const { ...body } = params;

  const res = await client.post("/ticket", body);

  return res.data;
}

export async function giveCoin(params: GiveCoinParams) {
  const { ...body } = params;

  const res = await client.post("/coin", body);

  return res.data;
}

export type IAPProduct = {
  id: number;
  owenr: {
    username: string;
  };
  profileId: string;
  platform: string;
  productId: string;
  transactionId: string;
  dueAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
