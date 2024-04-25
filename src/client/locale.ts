import client from "./@base";
import { CreateLocaleParams, GetLocalesResult } from "./types";

export async function getLocales(page: number) {
  const res = await client.get<GetLocalesResult>("/locale", { params: { page } });

  return res.data;
}

export async function createLocale(params: CreateLocaleParams) {
  const { ...body } = params;

  const res = await client.post("/locale", body);

  return res.data;
}

export async function updateLocale(params: CreateLocaleParams & { id: number }) {
  const { id, ...body } = params;

  const res = await client.put(`/locale/${id}`, body);

  return res.data;
}

export async function removeLocale(id: number) {
  const res = await client.delete(`/locale/${id}`);

  return res.data;
}
