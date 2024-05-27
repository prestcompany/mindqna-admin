import client from "./@base";
import { AppRule, CreateRuleParams, QueryResultWithPagination, UpdateRuleParams } from "./types";

export async function getRules(page: number) {
  const res = await client.get<QueryResultWithPagination<AppRule>>("/rule", { params: { page } });

  return res.data;
}

export async function createRule(params: CreateRuleParams) {
  const { ...body } = params;

  const res = await client.post("/rule", body);

  return res.data;
}

export async function updateRule(params: UpdateRuleParams) {
  const { id, ...body } = params;

  const res = await client.put(`/rule/${id}`, body);

  return res.data;
}

export async function removeRule(id: number) {
  const res = await client.delete(`/rule/${id}`);

  return res.data;
}
