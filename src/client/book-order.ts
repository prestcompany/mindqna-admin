import client from './@base';
import {
  BookOrderBatchConfirmBody,
  BookOrderBatchConfirmResult,
  BookOrderBatchDetail,
  BookOrderBatchListResult,
} from './types';

export async function confirmBookOrderBatch(body: BookOrderBatchConfirmBody) {
  const res = await client.post<BookOrderBatchConfirmResult>('/book-export/batches', body);

  return res.data;
}

export async function getBookOrderBatches(params: { page: number; q?: string }) {
  const res = await client.get<BookOrderBatchListResult>('/book-export/batches', { params });

  return res.data;
}

export async function getBookOrderBatch(id: number) {
  const res = await client.get<BookOrderBatchDetail>(`/book-export/batches/${id}`);

  return res.data;
}
