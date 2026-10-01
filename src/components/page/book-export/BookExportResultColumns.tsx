import type { BookOrderValidation } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';
import { Eye } from 'lucide-react';
import BookExportStatusBadge from './BookExportStatusBadge';
import { isSelectableOrder } from './services/book-export-download';

export interface BookExportColumnActions {
  selected: Set<string>;
  /** Whether every currently visible, selectable row is selected. */
  allVisibleSelected: boolean;
  /** Whether at least one currently visible row is selectable. */
  hasVisibleSelectable: boolean;
  onToggle: (orderNo: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onPreview: (order: BookOrderValidation) => void;
}

export const createBookExportResultColumns = (selection: BookExportColumnActions): ColumnDef<BookOrderValidation>[] => [
  {
    id: 'select',
    size: 40,
    header: () => (
      <Checkbox
        aria-label='추출 가능한 주문 전체 선택'
        checked={selection.allVisibleSelected}
        disabled={!selection.hasVisibleSelectable}
        onCheckedChange={(checked) => selection.onToggleAll(checked === true)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`${row.original.orderNo} 선택`}
        checked={selection.selected.has(row.original.orderNo)}
        disabled={!isSelectableOrder(row.original)}
        onCheckedChange={(checked) => selection.onToggle(row.original.orderNo, checked === true)}
      />
    ),
  },
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
        <div className='truncate font-mono text-xs text-muted-foreground'>{row.original.spaceId || '(비어 있음)'}</div>
      </div>
    ),
  },
  {
    id: 'range',
    header: '범위',
    size: 130,
    cell: ({ row }) => (
      <div className='tabular-nums'>
        <div className='text-foreground'>{row.original.rangeRaw || '-'}</div>
        {row.original.startOrder !== null && row.original.exportEnd !== null ? (
          <div className='text-xs text-muted-foreground'>
            수록 {row.original.startOrder}~{row.original.exportEnd}
          </div>
        ) : null}
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
    header: '표지 · 내지',
    size: 130,
    cell: ({ row }) => (
      <div className='min-w-0 text-sm'>
        <div className='truncate text-foreground'>{row.original.coverColor || '-'}</div>
        <div className='truncate text-xs text-muted-foreground'>{row.original.paidInner || '-'}</div>
      </div>
    ),
  },
  {
    id: 'status',
    header: '상태',
    size: 260,
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
        disabled={!isSelectableOrder(row.original)}
        onClick={(event) => {
          event.stopPropagation();
          selection.onPreview(row.original);
        }}
      >
        <Eye className='h-4 w-4' />
        미리보기
      </Button>
    ),
  },
];
