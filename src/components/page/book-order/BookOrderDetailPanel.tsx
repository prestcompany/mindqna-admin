import { getBookOrderBatch } from '@/client/book-order';
import type { BookExportRejectedOrder, BookExportRequestOrder } from '@/client/types';
import { errorMessage } from '@/components/page/coupon/errorMessage';
import DataTable from '@/components/shared/ui/data-table';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import BookExportPreviewDialog from './BookExportPreviewDialog';
import { createBookOrderBatchItemColumns } from './BookOrderBatchItemColumns';
import { batchItemToExportRequest, buildBatchZipName } from './services/book-order-batch';
import { useBookZipDownload } from './useBookZipDownload';

type Props = {
  batchId: number;
  /** Orders the confirm refused: they are NOT part of this 발주. Shown once right after confirming. */
  confirmRejected?: BookExportRejectedOrder[];
  /** Orders stored in this 발주 but missing from the first zip. Shown once right after confirming. */
  downloadRejected?: BookExportRejectedOrder[];
  onBusyChange: (isBusy: boolean) => void;
};

function RejectedList({ title, items }: { title: string; items: BookExportRejectedOrder[] }) {
  return (
    <div className='rounded-md border border-border p-3'>
      <p className='text-sm font-medium text-foreground'>
        {title} {items.length}건
      </p>
      <ul className='mt-2 space-y-1'>
        {items.map((item) => (
          <li key={item.orderNo} className='text-xs text-muted-foreground'>
            <span className='font-mono'>{item.orderNo}</span> {item.issues.map((issue) => issue.message).join(' ')}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookOrderDetailPanel({ batchId, confirmRejected = [], downloadRejected = [], onBusyChange }: Props) {
  const {
    data: batch,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['book-order-batch', batchId],
    queryFn: () => getBookOrderBatch(batchId),
    // A 발주 is evidence and never changes once stored.
    staleTime: Infinity,
  });
  const zip = useBookZipDownload();
  const [previewRequest, setPreviewRequest] = useState<BookExportRequestOrder | null>(null);
  const [redownloadRejected, setRedownloadRejected] = useState<BookExportRejectedOrder[]>([]);

  if (isLoading) {
    return (
      <p className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        불러오는 중입니다.
      </p>
    );
  }
  if (error || !batch) {
    const isMissing = isAxiosError(error) && error.response?.status === 404;
    return <p className='text-sm text-foreground'>{isMissing ? '발주를 찾을 수 없습니다.' : errorMessage(error)}</p>;
  }

  const redownload = async () => {
    onBusyChange(true);
    setRedownloadRejected([]);
    try {
      const run = await zip.download({
        orders: batch.items.map(batchItemToExportRequest),
        fileName: buildBatchZipName(batch.id, new Date()),
      });
      setRedownloadRejected(run.rejected);
      if (run.bookCount === 0) toast.warning('지금 추출할 수 있는 주문이 없습니다.');
      else
        toast.success(
          run.rejected.length > 0
            ? `${run.bookCount}건을 다시 내려받았습니다. ${run.rejected.length}건은 제외되었습니다.`
            : `${run.bookCount}건을 다시 내려받았습니다.`,
        );
    } catch (err) {
      toast.error(`다운로드를 중단했습니다. ${errorMessage(err)}`);
    }
    onBusyChange(false);
  };

  const columns = createBookOrderBatchItemColumns({
    onPreview: (item) => setPreviewRequest(batchItemToExportRequest(item)),
    isDownloading: zip.isDownloading,
  });

  return (
    <>
      <div className='space-y-4 pb-4'>
        <dl className='grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border p-4 text-sm sm:grid-cols-3'>
          <div>
            <dt className='text-muted-foreground'>발주 번호</dt>
            <dd className='font-medium tabular-nums text-foreground'>#{batch.id}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>확정일시</dt>
            <dd className='tabular-nums text-foreground'>{dayjs(batch.createdAt).format('YY.MM.DD HH:mm')}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>담당자</dt>
            <dd className='text-foreground'>{batch.managerName}</dd>
          </div>
          <div>
            <dt className='text-muted-foreground'>주문 수</dt>
            <dd className='tabular-nums text-foreground'>{batch.itemCount}건</dd>
          </div>
          <div className='col-span-2'>
            <dt className='text-muted-foreground'>원본 파일</dt>
            <dd className='truncate text-foreground'>{batch.sourceFileName}</dd>
          </div>
          <div className='col-span-full'>
            <dt className='text-muted-foreground'>메모</dt>
            <dd className='whitespace-pre-wrap text-foreground'>{batch.memo || '-'}</dd>
          </div>
        </dl>

        {confirmRejected.length > 0 ? (
          <RejectedList title='확정에서 제외되어 발주에 포함되지 않은 주문' items={confirmRejected} />
        ) : null}
        {downloadRejected.length > 0 ? (
          <RejectedList title='발주에는 포함됐지만 zip에서 빠진 주문' items={downloadRejected} />
        ) : null}
        {redownloadRejected.length > 0 ? (
          <RejectedList title='다시 받기에서 제외된 주문' items={redownloadRejected} />
        ) : null}

        <DataTable columns={columns} data={batch.items} rowKey='orderNo' />
      </div>

      <BookExportPreviewDialog request={previewRequest} onClose={() => setPreviewRequest(null)} />

      <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
        <div className='flex items-center justify-end gap-3'>
          <span className='mr-auto text-xs text-muted-foreground'>다시 받는 zip은 현재 데이터로 새로 만들어집니다.</span>
          {zip.progress ? (
            <span className='text-sm tabular-nums text-muted-foreground'>
              {zip.progress.done} / {zip.progress.total}건 처리 중
            </span>
          ) : null}
          <Button type='button' onClick={redownload} disabled={zip.isDownloading}>
            {zip.isDownloading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
            zip 다시 받기
          </Button>
        </div>
      </div>
    </>
  );
}

export default BookOrderDetailPanel;
