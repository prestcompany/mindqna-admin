import { validateBookOrders } from '@/client/book-export';
import type { BookExportRejectedOrder, BookOrderLevel, BookOrderValidation, BookExportRequestOrder } from '@/client/types';
import { CardUploader } from '@/components/page/card/CardUploader';
import { errorMessage } from '@/components/page/coupon/errorMessage';
import DataTable from '@/components/shared/ui/data-table';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import BookExportLevelFilter from './BookExportLevelFilter';
import BookExportPreviewDialog from './BookExportPreviewDialog';
import { createBookExportResultColumns } from './BookExportResultColumns';
import {
  areAllVisibleSelected,
  buildBookZipName,
  countOrdersByLevel,
  isSelectableOrder,
  toBookExportRequest,
  toggleVisibleSelection,
} from './services/book-export-download';
import { useBookZipDownload } from './useBookZipDownload';

type LevelFilter = 'all' | BookOrderLevel;

type Props = {
  onBusyChange: (isBusy: boolean) => void;
};

function BookExportPanel({ onBusyChange }: Props) {
  const [orders, setOrders] = useState<BookOrderValidation[] | null>(null);
  const [filter, setFilter] = useState<LevelFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewRequest, setPreviewRequest] = useState<BookExportRequestOrder | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const zip = useBookZipDownload();
  const progress = zip.progress;
  const [rejected, setRejected] = useState<BookExportRejectedOrder[]>([]);
  // Ignores a validation response that arrives after a newer upload started.
  const latestValidation = useRef(0);

  const selectable = useMemo(() => (orders ?? []).filter(isSelectableOrder), [orders]);
  const counts = useMemo(() => countOrdersByLevel(orders ?? []), [orders]);
  const visible = useMemo(
    () => (orders ?? []).filter((order) => filter === 'all' || order.level === filter),
    [orders, filter],
  );
  const visibleSelectableOrderNos = useMemo(
    () => visible.filter(isSelectableOrder).map((order) => order.orderNo),
    [visible],
  );

  const validate = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const requestId = latestValidation.current + 1;
    latestValidation.current = requestId;
    setIsValidating(true);
    setRejected([]);
    try {
      const result = await validateBookOrders(file);
      if (requestId !== latestValidation.current) return;
      setOrders(result.orders);
      setFilter('all');
      setSelected(new Set(result.orders.filter(isSelectableOrder).map((order) => order.orderNo)));
    } catch (err) {
      if (requestId !== latestValidation.current) return;
      setOrders(null);
      setSelected(new Set());
      toast.error(errorMessage(err));
    }
    setIsValidating(false);
  };

  const download = async () => {
    const targets = selectable.filter((order) => selected.has(order.orderNo)).map(toBookExportRequest);
    if (targets.length === 0) return;
    onBusyChange(true);
    setRejected([]);
    try {
      const run = await zip.download({ orders: targets, fileName: buildBookZipName(new Date()) });
      setRejected(run.rejected);
      if (run.bookCount === 0) {
        toast.warning('추출할 수 있는 주문이 없습니다.');
      } else {
        toast.success(
          run.rejected.length > 0
            ? `${run.bookCount}건을 zip으로 내려받았습니다. ${run.rejected.length}건은 제외되었습니다.`
            : `${run.bookCount}건을 zip으로 내려받았습니다.`,
        );
      }
    } catch (err) {
      toast.error(`다운로드를 중단했습니다. ${errorMessage(err)}`);
    }
    onBusyChange(false);
  };

  const isDownloading = progress !== null;
  const isBusy = isValidating || isDownloading;

  const columns = createBookExportResultColumns({
    selected,
    allVisibleSelected: areAllVisibleSelected({ selected, visibleSelectable: visibleSelectableOrderNos }),
    hasVisibleSelectable: visibleSelectableOrderNos.length > 0,
    onToggle: (orderNo, checked) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (checked) next.add(orderNo);
        else next.delete(orderNo);
        return next;
      }),
    onToggleAll: (checked) =>
      setSelected((prev) => toggleVisibleSelection({ selected: prev, visibleSelectable: visibleSelectableOrderNos, checked })),
    onPreview: (order) => setPreviewRequest(toBookExportRequest(order)),
    isDownloading,
  });

  return (
    <>
      <div className='space-y-4 pb-4'>
        {/* CardUploader has no disabled prop; block it while a validation or download is running. */}
        <div aria-busy={isBusy} className={isBusy ? 'pointer-events-none opacity-50' : undefined}>
          <CardUploader setFile={validate} accept='.csv,.xlsx' />
        </div>
        {isValidating ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            주문을 확인하고 있습니다.
          </p>
        ) : null}

        {rejected.length > 0 ? (
          <div className='rounded-md border border-border p-3'>
            <p className='text-sm font-medium text-foreground'>다운로드 시점에 제외된 주문 {rejected.length}건</p>
            <ul className='mt-2 space-y-1'>
              {rejected.map((item) => (
                <li key={item.orderNo} className='text-xs text-muted-foreground'>
                  <span className='font-mono'>{item.orderNo}</span> {item.issues.map((issue) => issue.message).join(' ')}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {orders ? (
          <>
            <BookExportLevelFilter counts={counts} value={filter} onChange={setFilter} />
            <DataTable columns={columns} data={visible} rowKey='orderNo' />
          </>
        ) : null}
      </div>

      <BookExportPreviewDialog request={previewRequest} onClose={() => setPreviewRequest(null)} />

      {orders ? (
        <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
          <div className='flex items-center justify-end gap-3'>
            {isDownloading ? (
              <span className='text-sm tabular-nums text-muted-foreground'>
                {progress.done} / {progress.total}건 처리 중
              </span>
            ) : null}
            <Button type='button' onClick={download} disabled={isBusy || selected.size === 0}>
              {isDownloading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Download className='h-4 w-4' />}
              선택 {selected.size}건 zip 다운로드
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default BookExportPanel;
