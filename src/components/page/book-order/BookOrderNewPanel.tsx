import { confirmBookOrderBatch } from '@/client/book-order';
import { validateBookOrders } from '@/client/book-export';
import type {
  BookExportRejectedOrder,
  BookOrderBatchDetail,
  BookOrderLevel,
  BookOrderValidation,
  BookExportRequestOrder,
} from '@/client/types';
import { CardUploader } from '@/components/page/card/CardUploader';
import { errorMessage } from '@/components/page/coupon/errorMessage';
import DataTable from '@/components/shared/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import BookExportLevelFilter from './BookExportLevelFilter';
import BookExportPreviewDialog from './BookExportPreviewDialog';
import { createBookExportResultColumns } from './BookExportResultColumns';
import {
  areAllVisibleSelected,
  countOrdersByLevel,
  isSelectableOrder,
  toBookExportRequest,
  toggleVisibleSelection,
} from './services/book-export-download';
import {
  MAX_MANAGER_NAME_LENGTH,
  MAX_MEMO_LENGTH,
  batchItemToExportRequest,
  buildBatchZipName,
  canConfirmBatch,
  toBatchRequestOrder,
} from './services/book-order-batch';
import { resolvePaidQuestionCount } from './services/resolve-paid-question-count';
import { useBookZipDownload } from './useBookZipDownload';

type LevelFilter = 'all' | BookOrderLevel;

type Props = {
  onBusyChange: (isBusy: boolean) => void;
  onConfirmed: (params: {
    batch: BookOrderBatchDetail;
    confirmRejected: BookExportRejectedOrder[];
    downloadRejected: BookExportRejectedOrder[];
  }) => void;
};

function BookOrderNewPanel({ onBusyChange, onConfirmed }: Props) {
  const [serverOrders, setServerOrders] = useState<BookOrderValidation[] | null>(null);
  const [paidChoices, setPaidChoices] = useState<Map<string, number>>(new Map());
  const [filter, setFilter] = useState<LevelFilter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewRequest, setPreviewRequest] = useState<BookExportRequestOrder | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const zip = useBookZipDownload();
  const [sourceFileName, setSourceFileName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [memo, setMemo] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  // Ignores a validation response that arrives after a newer upload started.
  const latestValidation = useRef(0);

  const orders = useMemo(
    () =>
      serverOrders?.map((order) => {
        const chosen = paidChoices.get(order.orderNo);
        return chosen === undefined ? order : resolvePaidQuestionCount(order, chosen);
      }) ?? null,
    [serverOrders, paidChoices],
  );

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
    setSourceFileName(file.name);
    const requestId = latestValidation.current + 1;
    latestValidation.current = requestId;
    setIsValidating(true);
    try {
      const result = await validateBookOrders(file);
      if (requestId !== latestValidation.current) return;
      setServerOrders(result.orders);
      setPaidChoices(new Map());
      setFilter('all');
      setSelected(new Set(result.orders.filter(isSelectableOrder).map((order) => order.orderNo)));
    } catch (err) {
      if (requestId !== latestValidation.current) return;
      setServerOrders(null);
      setPaidChoices(new Map());
      setSelected(new Set());
      toast.error(errorMessage(err));
    }
    setIsValidating(false);
  };

  const confirm = async () => {
    const targets = selectable.filter((order) => selected.has(order.orderNo)).map(toBatchRequestOrder);
    if (targets.length === 0) return;
    onBusyChange(true);
    setIsConfirming(true);
    let batch: BookOrderBatchDetail;
    let confirmRejected: BookExportRejectedOrder[];
    let downloadRejected: BookExportRejectedOrder[] = [];
    try {
      const result = await confirmBookOrderBatch({
        managerName: managerName.trim(),
        memo: memo.trim() || null,
        sourceFileName,
        orders: targets,
      });
      batch = result.batch;
      confirmRejected = result.rejected;
    } catch (err) {
      toast.error(errorMessage(err));
      setIsConfirming(false);
      onBusyChange(false);
      return;
    }
    setIsConfirming(false);
    try {
      const run = await zip.download({
        orders: batch.items.map(batchItemToExportRequest),
        fileName: buildBatchZipName(batch.id, new Date()),
      });
      downloadRejected = run.rejected;
      const excludedCount = confirmRejected.length + downloadRejected.length;
      if (run.bookCount === 0) {
        toast.warning(`발주 #${batch.id}을 저장했지만 지금 추출할 수 있는 주문이 없습니다.`);
      } else {
        toast.success(
          excludedCount > 0
            ? `발주 #${batch.id}을 확정하고 ${run.bookCount}건을 내려받았습니다. ${excludedCount}건은 제외되었습니다.`
            : `발주 #${batch.id}을 확정하고 ${run.bookCount}건을 내려받았습니다.`,
        );
      }
    } catch (err) {
      toast.error(
        `발주 #${batch.id}은 저장되었습니다. zip 다운로드가 실패했으니 발주 상세에서 다시 받아 주세요. ${errorMessage(err)}`,
      );
    }
    onBusyChange(false);
    onConfirmed({ batch, confirmRejected, downloadRejected });
  };

  const isDownloading = zip.isDownloading;
  const isBusy = isValidating || isConfirming || isDownloading;

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
      setSelected((prev) =>
        toggleVisibleSelection({ selected: prev, visibleSelectable: visibleSelectableOrderNos, checked }),
      ),
    onPreview: (order) => setPreviewRequest(toBookExportRequest(order)),
    // Locks the preview and pick buttons while either a download or a confirm is in flight.
    isDownloading: isDownloading || isConfirming,
    paidChoice: (orderNo) => paidChoices.get(orderNo),
    onChoosePaidCount: (orderNo, value) => {
      setPaidChoices((prev) => {
        const next = new Map(prev);
        if (value === null) next.delete(orderNo);
        else next.set(orderNo, value);
        return next;
      });
      // Select it only if the pick actually unblocks the order; another error keeps it unselectable.
      const serverOrder = serverOrders?.find((order) => order.orderNo === orderNo);
      const isUnblocked =
        value !== null && serverOrder !== undefined && resolvePaidQuestionCount(serverOrder, value).level !== 'error';
      setSelected((prev) => {
        const next = new Set(prev);
        if (isUnblocked) next.add(orderNo);
        else next.delete(orderNo);
        return next;
      });
    },
  });

  return (
    <>
      <div className='space-y-4 pb-4'>
        {/* CardUploader has no disabled prop; block it while a validation or confirm is running. */}
        <div aria-busy={isBusy} className={isBusy ? 'pointer-events-none opacity-50' : undefined}>
          <CardUploader setFile={validate} accept='.csv,.xlsx' />
        </div>
        {isValidating ? (
          <p className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Loader2 className='h-4 w-4 animate-spin' />
            주문을 확인하고 있습니다.
          </p>
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
          <div className='grid gap-3 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto] sm:items-end'>
            <div className='space-y-1.5'>
              <Label htmlFor='book-order-manager'>담당자명</Label>
              <Input
                id='book-order-manager'
                value={managerName}
                maxLength={MAX_MANAGER_NAME_LENGTH}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder='필수'
                disabled={isBusy}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='book-order-memo'>메모</Label>
              <Textarea
                id='book-order-memo'
                value={memo}
                maxLength={MAX_MEMO_LENGTH}
                onChange={(e) => setMemo(e.target.value)}
                placeholder='선택'
                rows={1}
                disabled={isBusy}
              />
            </div>
            <div className='flex items-center justify-end gap-3'>
              {zip.progress ? (
                <span className='text-sm tabular-nums text-muted-foreground'>
                  {zip.progress.done} / {zip.progress.total}건 처리 중
                </span>
              ) : null}
              <Button
                type='button'
                onClick={confirm}
                disabled={!canConfirmBatch({ managerName, selectedCount: selected.size, isBusy })}
              >
                {isBusy && !isValidating ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <CheckCircle2 className='h-4 w-4' />
                )}
                선택 {selected.size}건 발주 확정
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default BookOrderNewPanel;
