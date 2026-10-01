import { getBookOrderBatches } from '@/client/book-order';
import type { BookExportRejectedOrder, BookOrderBatchSummary } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar, type FilterChipItem } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import BookOrderDetailPanel from './BookOrderDetailPanel';

const PAGE_SIZE = 20;

type SheetState = {
  mode: 'detail';
  batchId: number;
  confirmRejected?: BookExportRejectedOrder[];
  downloadRejected?: BookExportRejectedOrder[];
} | null;

const columns: ColumnDef<BookOrderBatchSummary>[] = [
  {
    id: 'id',
    header: '발주 번호',
    size: 96,
    cell: ({ row }) => <span className='font-medium tabular-nums text-foreground'>#{row.original.id}</span>,
  },
  {
    id: 'createdAt',
    header: '확정일시',
    size: 140,
    cell: ({ row }) => (
      <span className='text-sm tabular-nums text-muted-foreground'>
        {dayjs(row.original.createdAt).format('YY.MM.DD HH:mm')}
      </span>
    ),
  },
  { id: 'managerName', header: '담당자', size: 120, cell: ({ row }) => row.original.managerName },
  {
    id: 'itemCount',
    header: '주문 수',
    size: 90,
    cell: ({ row }) => <span className='tabular-nums text-foreground'>{row.original.itemCount}건</span>,
  },
  {
    id: 'sourceFileName',
    header: '원본 파일',
    size: 220,
    cell: ({ row }) => <span className='block truncate'>{row.original.sourceFileName}</span>,
  },
  {
    id: 'memo',
    header: '메모',
    size: 240,
    cell: ({ row }) => <span className='block truncate text-muted-foreground'>{row.original.memo || '-'}</span>,
  },
];

function BookOrderList() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [isSheetBusy, setIsSheetBusy] = useState(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['book-order-batches', page, q],
    queryFn: () => getBookOrderBatches({ page, q: q || undefined }),
    placeholderData: keepPreviousData,
  });

  const applySearch = () => {
    setPage(1);
    setQ(search.trim());
  };

  const chips: FilterChipItem[] = q ? [{ key: 'q', label: `검색: ${q}` }] : [];

  return (
    <>
      <FilterBar
        chips={chips}
        onRemoveChip={() => {
          setSearch('');
          setQ('');
          setPage(1);
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          placeholder='주문번호 · 공간 ID · 담당자명'
          className={`w-64 ${FILTER_CONTROL_CLASS}`}
        />
        <Button onClick={applySearch} disabled={isFetching} className={`${FILTER_CONTROL_CLASS} [&_svg]:size-3.5`}>
          <Search className='h-3.5 w-3.5' />
          검색
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isLoading}
        rowKey={(record) => String(record.id)}
        onRow={(record) => ({ onClick: () => setSheet({ mode: 'detail', batchId: record.id }) })}
        emptyState={<p className='text-sm text-muted-foreground'>{q ? '검색 결과가 없습니다.' : '아직 발주가 없습니다.'}</p>}
        pagination={{ total: data?.totalCount ?? 0, page, pageSize: PAGE_SIZE, onChange: setPage }}
      />

      <Sheet
        open={sheet !== null}
        onOpenChange={(open) => {
          // Closing mid-download would unmount the panel and drop the zip being built.
          if (!open && isSheetBusy) {
            toast.info('작업이 끝나면 닫을 수 있습니다.');
            return;
          }
          if (!open) setSheet(null);
        }}
      >
        {sheet?.mode === 'detail' ? (
          <AdminSideSheetContent title={`발주 #${sheet.batchId}`} description='확정 시점에 저장된 주문 기록입니다.' size='xl'>
            <BookOrderDetailPanel
              batchId={sheet.batchId}
              confirmRejected={sheet.confirmRejected}
              downloadRejected={sheet.downloadRejected}
              onBusyChange={setIsSheetBusy}
            />
          </AdminSideSheetContent>
        ) : null}
      </Sheet>
    </>
  );
}

export default BookOrderList;
