import { abortPush, AdminPushItem, cancelPush, removePush } from '@/client/push';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import usePushes from '@/hooks/usePushes';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { createPushColumns } from './PushColumns';
import PushForm from './PushForm';
import { PUSH_STATUS_META } from './services/push-status';

type Pending = { kind: 'cancel' | 'abort' | 'delete'; row: AdminPushItem } | null;

const confirmCopy: Record<'cancel' | 'abort' | 'delete', (row: AdminPushItem) => { title: string; body: string }> = {
  cancel: (row) => ({ title: '예약을 취소할까요?', body: `"${row.title}" 은 발송되지 않습니다.` }),
  abort: (row) => ({
    title: '발송을 중단할까요?',
    // Abort is not undo, and the operator must know that before pressing it.
    body: `"${row.title}" 의 남은 발송을 멈춥니다. 이미 발송된 ${row.sentCount.toLocaleString()}명에게는 취소되지 않습니다.`,
  }),
  delete: (row) => ({ title: '삭제할까요?', body: `"${row.title}" 을 목록에서 지웁니다.` }),
};

function PushList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[]; status?: string[] }>({});
  const [sheet, setSheet] = useState<{ mode: 'create' | 'edit' | 'view'; row?: AdminPushItem } | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const { items, totalPage, isLoading } = usePushes({ page, locale: filter.locale, status: filter.status });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['pushes'] });

  const run = async () => {
    if (!pending) return;
    const { kind, row } = pending;
    try {
      if (kind === 'cancel') await cancelPush(row.id);
      if (kind === 'abort') await abortPush(row.id);
      if (kind === 'delete') await removePush(row.id);
      toast.success('처리되었습니다');
      await invalidate();
    } catch {
      toast.error('처리하지 못했습니다');
    } finally {
      setPending(null);
    }
  };

  const columns = createPushColumns({
    onView: (row) => setSheet({ mode: 'view', row }),
    onEdit: (row) => setSheet({ mode: 'edit', row }),
    onDuplicate: (row) => setSheet({ mode: 'create', row }),
    onCancel: (row) => setPending({ kind: 'cancel', row }),
    onAbort: (row) => setPending({ kind: 'abort', row }),
    onDelete: (row) => setPending({ kind: 'delete', row }),
  });

  const confirmContent = pending ? confirmCopy[pending.kind](pending.row) : null;

  return (
    <>
      <FilterBar>
        <Select
          value={filter.locale?.[0] ?? ''}
          onValueChange={(v) => setFilter((p) => ({ ...p, locale: v ? [v] : undefined }))}
        >
          <SelectTrigger className={`w-[120px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='언어' />
          </SelectTrigger>
          <SelectContent>
            {['ko', 'en', 'ja', 'zh', 'zhTw', 'es', 'id'].map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filter.status?.[0] ?? ''}
          onValueChange={(v) => setFilter((p) => ({ ...p, status: v ? [v] : undefined }))}
        >
          <SelectTrigger className={`w-[140px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='상태' />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PUSH_STATUS_META).map(([value, meta]) => (
              <SelectItem key={value} value={value}>
                {meta.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className='flex-1' />
        <Button className={FILTER_CONTROL_CLASS} onClick={() => setSheet({ mode: 'create' })}>
          푸시 등록
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={{ total: totalPage * 10, page, pageSize: 10, onChange: setPage }}
      />

      {sheet && (
        <PushForm
          mode={sheet.mode}
          initial={sheet.row}
          onClose={() => setSheet(null)}
          onSaved={async () => {
            setSheet(null);
            await invalidate();
          }}
        />
      )}

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmContent?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmContent?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={run}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PushList;
