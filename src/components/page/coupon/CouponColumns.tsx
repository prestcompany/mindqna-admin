import type { CouponBatch } from '@/client/coupon';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { ChevronDown, ChevronRight } from 'lucide-react';
import CouponRewardCell from './CouponRewardCell';
import CouponStatusBadge from './CouponStatusBadge';
import CouponUsageMeter from './CouponUsageMeter';

export interface CouponRowActions {
  onEdit: (batch: CouponBatch) => void;
  onStop: (batch: CouponBatch) => void;
  onDelete: (batch: CouponBatch) => void;
}

export const createCouponColumns = (actions: CouponRowActions): ColumnDef<CouponBatch>[] => [
  {
    id: 'expander',
    header: '',
    size: 40,
    meta: { useTruncateTooltip: false },
    cell: ({ row }) => (
      <button
        type='button'
        aria-label={row.getIsExpanded() ? '코드 접기' : '코드 펼치기'}
        onClick={row.getToggleExpandedHandler()}
        className='inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-500 transition-colors duration-fast hover:bg-slate-100 hover:text-slate-700'
      >
        {row.getIsExpanded() ? <ChevronDown className='h-4 w-4' /> : <ChevronRight className='h-4 w-4' />}
      </button>
    ),
  },
  {
    id: 'coupon',
    header: '쿠폰',
    size: 220,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate font-medium text-slate-900'>{row.original.name}</div>
        <div className='truncate font-mono text-xs text-slate-600'>
          {row.original.issueMode === 'SHARED' ? row.original.code : `코드 ${row.original.codeCount}개`}
        </div>
      </div>
    ),
  },
  {
    id: 'issueMode',
    header: '모드',
    size: 88,
    cell: ({ row }) => (
      <Badge variant={row.original.issueMode === 'SHARED' ? 'softInfo' : 'softNeutral'}>
        {row.original.issueMode === 'SHARED' ? '공용' : '개별'}
      </Badge>
    ),
  },
  {
    id: 'reward',
    header: '보상',
    size: 200,
    cell: ({ row }) => (
      <CouponRewardCell
        heart={row.original.heart}
        star={row.original.star}
        ticketCount={row.original.ticketCount}
        ticketDueDayNum={row.original.ticketDueDayNum}
      />
    ),
  },
  {
    id: 'usage',
    header: '사용 현황',
    size: 140,
    cell: ({ row }) => <CouponUsageMeter used={row.original.usedCount} capacity={row.original.capacity} />,
  },
  {
    id: 'period',
    header: '기간',
    size: 170,
    cell: ({ row }) => (
      <span className='text-sm text-slate-500'>
        {dayjs(row.original.startAt).format('YY.MM.DD')} – {dayjs(row.original.dueAt).format('YY.MM.DD')}
      </span>
    ),
  },
  {
    id: 'status',
    header: '상태',
    size: 104,
    cell: ({ row }) => <CouponStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: '발급일',
    size: 120,
    cell: ({ row }) => (
      <span className='text-sm text-slate-500'>{dayjs(row.original.createdAt).format('YY.MM.DD')}</span>
    ),
  },
  {
    id: 'actions',
    header: '관리',
    size: 80,
    cell: ({ row }) => {
      const batch = row.original;
      return (
        <TableRowActions
          items={[
            { label: '수정', onClick: () => actions.onEdit(batch) },
            ...(batch.status === 'EXPIRED'
              ? []
              : [{ label: '발급 중단', onClick: () => actions.onStop(batch) }]),
            { label: '삭제', onClick: () => actions.onDelete(batch), destructive: true },
          ]}
        />
      );
    },
  },
];
