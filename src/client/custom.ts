import client from './@base';
import { CreatePetCustomTemplateParams, GetPetCustomTemplatesResult } from './types';

export async function createCustomTemplate(params: CreatePetCustomTemplateParams) {
  const { ...body } = params;

  const res = await client.post(`/pet/customs`, body);

  return res.data;
}

export async function getCustomTemplates(page: number) {
  const res = await client.get<GetPetCustomTemplatesResult>('/pet/customs', { params: { page } });

  return res.data;
}

export async function updateCustomTemplate(params: CreatePetCustomTemplateParams & { id: number }) {
  const { id, ...body } = params;
  const res = await client.put(`/pet/customs/${id}`, body);

  return res.data;
}

export async function removeCustomTemplate(id: number) {
  const res = await client.delete(`/pet/customs/${id}`);

  return res.data;
}
