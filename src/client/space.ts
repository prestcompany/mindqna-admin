import client from "./@base";
import { QueryResultWithPagination, Space, SpaceType } from "./types";

export async function getSpaces(page: number, type?: SpaceType[], locale?: string[]) {
  const res = await client.get<QueryResultWithPagination<Space>>("/space", { params: { page, type, locale } });

  return res.data;
}

export async function getSpace(id: string) {
  const res = await client.get(`/space/${id}`);

  return res.data;
}

export async function removeSpace(id: string) {
  const res = await client.delete(`/space/${id}`);

  return res.data;
}

export async function removeProfile(id: string) {
  const res = await client.delete(`/profile/${id}`);

  return res.data;
}
