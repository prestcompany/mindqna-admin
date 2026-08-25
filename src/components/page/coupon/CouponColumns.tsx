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

/**
 * The sentence under the status badge. Status is derived from these very dates on the
 * server, so putting the two together lets a row explain itself: an absolute date alone
 * makes the reader subtract today's date in their head to learn what it means.
 */
function describePeriod(batch: CouponBatch): string {
  const start = dayjs(batch.startAt);
  const due = dayjs(batch.dueAt);
  const now = dayjs();

  if (batch.status === 'SCHEDULED') {
    const days = start.startOf('day').diff(now.startOf('day'), 'day');
    return `${start.format('M월 D일')} 시작 · ${days}일 후`;
  }

  if (batch.status === 'EXPIRED') {
    // A one-day range printed as "24.06.28 – 24.06.28" makes the reader compare two
    // identical dates to learn it lasted a day. Say that instead.
    if (start.format('YY.MM.DD') === due.format('YY.MM.DD')) return `${start.format('YY.MM.DD')} 하루`;
    return `${due.format('YY.MM.DD')} 종료`;
  }

  const days = due.startOf('day').diff(now.startOf('day'), 'day');
  const until = `${due.format('M월 D일')}까지`;
  if (batch.status === 'EXHAUSTED') return until;
  return days <= 0 ? `${until} · 오늘 종료` : `${until} · ${days}일 남음`;
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
        className='inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
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
        <div className='truncate font-medium text-foreground'>{row.original.name}</div>
        <div className='truncate text-xs text-muted-foreground'>
          {row.original.issueMode === 'SHARED' ? (
            <span className='font-mono text-foreground'>{row.original.code}</span>
          ) : (
            `코드 ${row.original.codeCount}개`
          )}
        </div>
      </div>
    ),
  },
  {
    id: 'issueMode',
    header: '타입',
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
    size: 180,
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
    size: 170,
    cell: ({ row }) => <CouponUsageMeter used={row.original.usedCount} capacity={row.original.capacity} />,
  },
  {
    id: 'period',
    header: '상태 · 기간',
    size: 200,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <CouponStatusBadge status={row.original.status} />
        <div className='mt-0.5 truncate text-xs text-muted-foreground'>{describePeriod(row.original)}</div>
      </div>
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
            ...(batch.status === 'EXPIRED' ? [] : [{ label: '발급 중단', onClick: () => actions.onStop(batch) }]),
            { label: '삭제', onClick: () => actions.onDelete(batch), destructive: true },
          ]}
        />
      );
    },
  },
];
