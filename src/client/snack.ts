import client from "./@base";
import { CreateSnackParams, GetSnacksResult } from "./types";

export async function getSnacks(page: number) {
  const res = await client.get<GetSnacksResult>("/snack", { params: { page } });

  return res.data;
}

export async function createSnack(params: CreateSnackParams) {
  const { ...body } = params;

  const res = await client.post("/snack", body);

  return res.data;
}

export async function updateSnack(params: CreateSnackParams & { id: number }) {
  const { id, ...body } = params;

  const res = await client.put(`/snack/${id}`, body);

  return res.data;
}

export async function removeSnack(id: number) {
  const res = await client.delete(`/snack/${id}`);

  return res.data;
}
