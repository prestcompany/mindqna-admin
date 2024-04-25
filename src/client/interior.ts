import client from "./@base";
import { CreateInteriorTemplateParams, GetInteriorTemplatesResult } from "./types";

export async function createInteriorTemplate(params: CreateInteriorTemplateParams) {
  const { ...body } = params;

  const res = await client.post(`/interior/`, body);

  return res.data;
}

export async function getInteriorTemplates(page: number) {
  const res = await client.get<GetInteriorTemplatesResult>("/interior", { params: { page } });

  return res.data;
}

export async function updateInteriorTemplate(params: CreateInteriorTemplateParams & { id: number }) {
  const { id, ...body } = params;
  const res = await client.put(`/interior/${id}`, body);

  return res.data;
}

export async function removeInteriorTemplate(id: number) {
  const res = await client.delete(`/interior/${id}`);

  return res.data;
}
