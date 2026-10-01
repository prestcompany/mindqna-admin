import type { BookOrderBatchItem } from '@/client/types';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import BookExportStatusBadge from './BookExportStatusBadge';

export interface BookOrderBatchItemActions {
  onPreview: (item: BookOrderBatchItem) => void;
  isDownloading: boolean;
}

// Every value here is the confirm-time snapshot stored with the 발주.
export const createBookOrderBatchItemColumns = (
  actions: BookOrderBatchItemActions,
): ColumnDef<BookOrderBatchItem>[] => [
  {
    id: 'order',
    header: '주문',
    size: 170,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate font-mono text-sm text-foreground'>{row.original.orderNo}</div>
        <div className='truncate text-xs text-muted-foreground'>{row.original.orderedAt}</div>
      </div>
    ),
  },
  {
    id: 'space',
    header: '공간',
    size: 170,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate font-medium text-foreground'>{row.original.spaceName || '-'}</div>
        <div className='truncate font-mono text-xs text-muted-foreground'>{row.original.spaceId}</div>
      </div>
    ),
  },
  {
    id: 'range',
    header: '범위',
    size: 130,
    cell: ({ row }) => (
      <div className='tabular-nums'>
        <div className='text-foreground'>
          {row.original.startOrder}-{row.original.endOrder}
        </div>
        <div className='text-xs text-muted-foreground'>
          수록 {row.original.startOrder}~{row.original.exportEnd}
        </div>
      </div>
    ),
  },
  {
    id: 'count',
    header: '질문 수',
    size: 120,
    cell: ({ row }) => (
      <div className='text-sm tabular-nums'>
        <div className='text-foreground'>결제 {row.original.paidQuestionCount ?? '-'}</div>
        <div className='text-xs text-muted-foreground'>수록 {row.original.answeredCount}</div>
      </div>
    ),
  },
  {
    id: 'options',
    header: '표지 · 내지 · 패키지',
    size: 150,
    cell: ({ row }) => (
      <div className='min-w-0 text-sm'>
        <div className='truncate text-foreground'>{row.original.coverColor || '-'}</div>
        <div className='truncate text-xs text-muted-foreground'>{row.original.paidInner || '-'}</div>
        <div className='truncate text-xs text-muted-foreground'>{row.original.recordPackage || '-'}</div>
      </div>
    ),
  },
  {
    id: 'status',
    header: '상태',
    size: 240,
    cell: ({ row }) => (
      <div className='space-y-1'>
        <BookExportStatusBadge level={row.original.level} />
        {row.original.issues.map((issue) => (
          <p key={issue.code} className='text-xs text-muted-foreground'>
            {issue.message}
          </p>
        ))}
      </div>
    ),
  },
  {
    id: 'preview',
    header: '미리보기',
    size: 96,
    cell: ({ row }) => (
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={actions.isDownloading}
        onClick={(event) => {
          event.stopPropagation();
          actions.onPreview(row.original);
        }}
      >
        <Eye className='h-3.5 w-3.5' />
        미리보기
      </Button>
    ),
  },
];
