import type { BookExportBook } from '../../../../client/types';

export function toZipEntryName(orderNo: string): string {
  return `${orderNo.replace(/[^0-9A-Za-z_-]/g, '_')}.json`;
}

// Shared by the zip writer and the preview dialog so the two never drift apart.
export function toBookJson(book: BookExportBook): string {
  return JSON.stringify(book, null, 2);
}

// Streams books into the zip as each server chunk arrives, so the page never holds every book
// object at once and compression is spread across chunks. fflate is loaded only on download.
export async function createBookZipWriter() {
  const { Zip, ZipDeflate, strToU8 } = await import('fflate');
  const parts: Uint8Array[] = [];
  let failure: Error | null = null;
  let resolveDone: (blob: Blob) => void = () => undefined;
  let rejectDone: (err: Error) => void = () => undefined;
  const done = new Promise<Blob>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  const zip = new Zip((err, chunk, final) => {
    if (err) {
      failure = err;
      rejectDone(err);
      return;
    }
    parts.push(chunk);
    if (final) resolveDone(new Blob(parts as BlobPart[], { type: 'application/zip' }));
  });
  return {
    add(books: BookExportBook[]) {
      if (failure) throw failure;
      books.forEach((book) => {
        const entry = new ZipDeflate(toZipEntryName(book.orderNo), { level: 6 });
        zip.add(entry);
        entry.push(strToU8(toBookJson(book)), true);
      });
    },
    finish() {
      zip.end();
      return done;
    },
  };
}
