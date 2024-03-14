import client from "./@base";
import {
  CreateCardTemplateParams,
  GetCardTemplatesParams,
  GetCardTemplatesResult,
  UpdateCardTemplateParams,
} from "./types";

export async function getCardTemplates(params: GetCardTemplatesParams) {
  const res = await client.get<GetCardTemplatesResult>("/card", {
    params,
  });

  return res.data;
}

export async function createCardTemplate(params: CreateCardTemplateParams) {
  const res = await client.post("card", { ...params });

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
  const res = await client.put("card/publish", { templateIds });

  return res.data;
}

export async function unpublishCardTemplates(templateIds: number[]) {
  const res = await client.put("card/unpublish", { templateIds });

  return res.data;
}
