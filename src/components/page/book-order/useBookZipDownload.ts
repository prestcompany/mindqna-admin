import { getBookExportBooks } from '@/client/book-export';
import type { BookExportRequestOrder } from '@/client/types';
import { useState } from 'react';
import { runBookZipDownload, type BookZipRun } from './services/run-book-zip-download';

const REVOKE_DELAY_MS = 60_000;

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  // Revoking right away can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

// Shared by the new-발주 sheet and the detail sheet's re-download. Saves only when at least one
// book was built; rethrows when a chunk fails twice so the caller can say what happened.
export function useBookZipDownload() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const download = async ({
    orders,
    fileName,
  }: {
    orders: BookExportRequestOrder[];
    fileName: string;
  }): Promise<BookZipRun> => {
    setProgress({ done: 0, total: orders.length });
    try {
      const run = await runBookZipDownload({
        orders,
        fetchBooks: getBookExportBooks,
        onProgress: (done) => setProgress({ done, total: orders.length }),
      });
      if (run.bookCount > 0) saveBlob(run.zip, fileName);
      return run;
    } finally {
      setProgress(null);
    }
  };

  return { progress, isDownloading: progress !== null, download };
}
