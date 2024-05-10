import client from "./@base";
import { GiveCoinParams, GiveTicketParams, QueryResultWithPagination, TicketMeta } from "./types";

export async function getTickets(by: { page: number; type?: ("permanent" | "subscribe")[] }) {
  const res = await client.get<QueryResultWithPagination<TicketMeta>>("/ticket", { params: by });

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
