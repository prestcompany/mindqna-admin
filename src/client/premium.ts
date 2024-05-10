import client from "./@base";
import { GiveCoinParams, GiveTicketParams, Ticket } from "./types";

export async function getTickets() {
  const res = await client.get<Ticket[]>("/ticket");

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
