import client from './@base';
import { CreateBulkCardTemplatesParams, CreateCardTemplateParams, GetCardTemplatesParams, GetCardTemplatesResult, UpdateCardTemplateParams } from './types';

export async function getCardTemplates(params: GetCardTemplatesParams) {
  const res = await client.get<GetCardTemplatesResult>('/card', {
    params,
  });

  return res.data;
}

export async function createCardTemplate(params: CreateCardTemplateParams) {
  const res = await client.post('card', { ...params });

  return res.data;
}

export async function createBulkCardTemplates(params: CreateBulkCardTemplatesParams) {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('locale', params.locale);
  formData.append('cardType', params.cardType);
  formData.append('spaceType', params.spaceType);

  const res = await client.post('card/bulk', formData);

  return res.data;
}

export async function updateCardTemplate(params: UpdateCardTemplateParams) {
  const { templateId, ...body } = params;

  const res = await client.put(`card/${templateId}`, body);

  return res.data;
}

export async function removeCardTemplate(templateId: number) {
  const res = await client.delete(`card/${templateId}`);

  return res.data;
}

export async function publishCardTemplates(templateIds: number[]) {
  const res = await client.put('card/publish', { templateIds });

  return res.data;
}

export async function unpublishedCardTemplates(templateIds: number[]) {
  const res = await client.put('card/unpublished', { templateIds });

  return res.data;
}
