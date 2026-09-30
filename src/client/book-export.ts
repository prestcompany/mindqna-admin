import client from './@base';
import { BookExportBooksResult, BookExportRequestOrder, BookOrderValidationResult } from './types';

export async function validateBookOrders(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await client.post<BookOrderValidationResult>('/book-export/validate', formData);

  return res.data;
}

export async function getBookExportBooks(orders: BookExportRequestOrder[]) {
  const res = await client.post<BookExportBooksResult>('/book-export/books', { orders });

  return res.data;
}
