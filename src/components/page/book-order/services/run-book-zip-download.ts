import type { BookExportBooksResult, BookExportRejectedOrder, BookExportRequestOrder } from '../../../../client/types';
import { BOOKS_PER_REQUEST, chunkItems } from './book-export-download';
import { createBookZipWriter } from './book-zip-writer';

export type BookZipRun = { zip: Blob; bookCount: number; rejected: BookExportRejectedOrder[] };

type RunParams = {
  orders: BookExportRequestOrder[];
  fetchBooks: (chunk: BookExportRequestOrder[]) => Promise<BookExportBooksResult>;
  onProgress: (done: number) => void;
};

// One retry per chunk: a transient failure late in a long run should not throw away finished chunks.
async function fetchWithRetry(
  fetchBooks: RunParams['fetchBooks'],
  chunk: BookExportRequestOrder[],
): Promise<BookExportBooksResult> {
  try {
    return await fetchBooks(chunk);
  } catch {
    return fetchBooks(chunk);
  }
}

// Fetches books 20 at a time and streams them into one zip. A chunk that fails twice throws, so the
// caller never gets a partial zip.
export async function runBookZipDownload({ orders, fetchBooks, onProgress }: RunParams): Promise<BookZipRun> {
  const writer = await createBookZipWriter();
  const rejected: BookExportRejectedOrder[] = [];
  let bookCount = 0;
  let done = 0;
  for (const chunk of chunkItems(orders, BOOKS_PER_REQUEST)) {
    const result = await fetchWithRetry(fetchBooks, chunk);
    writer.add(result.books);
    bookCount += result.books.length;
    rejected.push(...result.rejected);
    done += chunk.length;
    onProgress(done);
  }
  return { zip: await writer.finish(), bookCount, rejected };
}
