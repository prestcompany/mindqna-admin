import type { AdminPushItem } from '@/client/push';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import PushProgressMeter from './PushProgressMeter';
import PushStatusBadge from './PushStatusBadge';
import { allowedActions } from './services/push-status';

export interface PushRowActions {
  onView: (row: AdminPushItem) => void;
  onEdit: (row: AdminPushItem) => void;
  onCancel: (row: AdminPushItem) => void;
  onAbort: (row: AdminPushItem) => void;
  onDuplicate: (row: AdminPushItem) => void;
  onDelete: (row: AdminPushItem) => void;
}

/**
 * An absolute timestamp alone makes the reader subtract today's date to learn what it
 * means. Pairing it with the status lets the row explain itself, as CouponColumns does.
 */
function relativeTime(iso: string, now = dayjs()): string {
  const at = dayjs(iso);
  const minutes = at.diff(now, 'minute');
  if (minutes > 0) {
    if (minutes < 60) return `${minutes}분 후`;
    if (minutes < 60 * 24) return `${Math.round(minutes / 60)}시간 후`;
    return `${Math.round(minutes / (60 * 24))}일 후`;
  }
  const past = -minutes;
  if (past < 1) return '방금';
  if (past < 60) return `${past}분 전`;
  if (past < 60 * 24) return `${Math.round(past / 60)}시간 전`;
  return `${Math.round(past / (60 * 24))}일 전`;
}

export const createPushColumns = (actions: PushRowActions): ColumnDef<AdminPushItem>[] => [
  { accessorKey: 'id', header: '번호', size: 64 },
  {
    id: 'target',
    header: '대상',
    cell: ({ row }) => {
      const item = row.original;
      if (item.target === 'ALL') return `전체 · ${item.locale ?? '—'}`;

      // A folded campaign's own userNames are its FIRST chunk's, so reading them here reports
      // one row's worth beside a progress column that already sums the whole campaign — the
      // list said "개인 · 2000명" and "0 / 8,014" on the same line. The audience is the sum,
      // and it was selected by conditions rather than typed in, so it is not "개인" either.
      const parts = (item as { parts?: unknown[] }).parts?.length ?? 1;
      if (parts > 1) return `조건 · ${(item.targetCount ?? 0).toLocaleString()}명`;

      return `개인 · ${(item.userNames ?? []).length}명`;
    },
  },
  {
    accessorKey: 'title',
    header: '제목',
    cell: ({ row }) => {
      // Present only on a folded campaign. A single send has one part and says nothing,
      // so the ordinary row is unchanged.
      const parts = (row.original as { parts?: unknown[] }).parts?.length ?? 1;
      const done = (row.original as { finishedParts?: number }).finishedParts ?? 0;
      return (
        <div className='min-w-0'>
          <div className='flex min-w-0 items-center gap-1.5'>
            <span className='truncate text-foreground'>{row.original.title}</span>
            {parts > 1 && (
              <span className='shrink-0 rounded border border-border px-1.5 py-px text-[11px] tabular-nums text-muted-foreground'>
                {done}/{parts}
              </span>
            )}
          </div>
          <div className='truncate text-xs text-muted-foreground'>{row.original.message}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'pushAt',
    header: '발송 시각',
    cell: ({ row }) => (
      <div className='tabular-nums'>
        <div>{dayjs(row.original.pushAt).format('YYYY.MM.DD HH:mm')}</div>
        <div className='text-xs text-muted-foreground'>{relativeTime(row.original.pushAt)}</div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: '상태',
    cell: ({ row }) => <PushStatusBadge status={row.original.status} failedCount={row.original.failedCount} />,
  },
  {
    id: 'progress',
    header: '진행',
    cell: ({ row }) => (
      <PushProgressMeter
        sentCount={row.original.sentCount}
        failedCount={row.original.failedCount}
        targetCount={row.original.targetCount}
        isApproximate={row.original.targetCountIsApproximate}
      />
    ),
  },
  {
    id: 'actions',
    header: '',
    size: 48,
    meta: { useTruncateTooltip: false },
    cell: ({ row }) => {
      const item = row.original;
      const labels: Record<string, string> = {
        view: '상세 보기',
        edit: '수정',
        cancel: '예약 취소',
        abort: '발송 중단',
        duplicate: '복제하여 새로 등록',
        delete: '삭제',
      };
      const handlers: Record<string, () => void> = {
        view: () => actions.onView(item),
        edit: () => actions.onEdit(item),
        cancel: () => actions.onCancel(item),
        abort: () => actions.onAbort(item),
        duplicate: () => actions.onDuplicate(item),
        delete: () => actions.onDelete(item),
      };
      return (
        <TableRowActions
          items={allowedActions(item.status, item.sentCount).map((action) => ({
            label: labels[action],
            onClick: handlers[action],
            destructive: action === 'delete' || action === 'abort',
          }))}
        />
      );
    },
  },
];
