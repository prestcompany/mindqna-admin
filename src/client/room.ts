import client from './@base';
import { QueryResultWithPagination } from './types';

export async function getRooms(page: number) {
  const res = await client.get<QueryResultWithPagination<RoomTemplate>>('/room', { params: { page } });

  return res.data;
}

export async function getToalRooms() {
  const res = await client.get<{ type: string }[]>('/room-total');

  return res.data;
}

export async function createRoom(params: CreateRoomParams) {
  const { ...body } = params;

  const res = await client.post('/room', body);

  return res.data;
}

export async function updateRoom(params: UpdateRoomParams) {
  const { id, ...body } = params;

  const res = await client.put(`/room/${id}`, body);

  return res.data;
}

export async function removeRoom(id: number) {
  const res = await client.delete(`/room/${id}`);

  return res.data;
}

export type RoomTemplate = {
  id: number;
  category: RoomCategory;
  type: string;
  price: number;
  isPaid: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type RoomCategory = 'rooftop' | 'inner' | 'outer';

export type CreateRoomParams = {
  category: RoomCategory;
  name: string;
  price: number;
  isPaid: boolean;
};

export type UpdateRoomParams = CreateRoomParams & {
  id: number;
  isActive: boolean;
};
