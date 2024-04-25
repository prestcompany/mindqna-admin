import client from "./@base";
import { CreateBubbleParams, GetBubblesResult } from "./types";

export async function getBubbless(page: number) {
  const res = await client.get<GetBubblesResult>("/bubble", { params: { page } });

  return res.data;
}

export async function createBubble(params: CreateBubbleParams) {
  const { ...body } = params;

  const res = await client.post("/bubble", body);

  return res.data;
}

export async function updateBubble(params: CreateBubbleParams & { id: number }) {
  const { id, ...body } = params;

  const res = await client.put(`/bubble/${id}`, body);

  return res.data;
}

export async function removeBubble(id: number) {
  const res = await client.delete(`/bubble/${id}`);

  return res.data;
}
