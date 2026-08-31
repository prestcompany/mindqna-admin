import { abortPush, AdminPushItem, AdminPushStatus, cancelPush, removePush } from '@/client/push';
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
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createPushColumns } from './PushColumns';
import PushForm from './PushForm';
import { PUSH_STATUS_META } from './services/push-status';
import { groupPushes } from './services/push-grouping';

type Pending = { kind: 'cancel' | 'abort' | 'delete'; row: AdminPushItem } | null;

const LOCALES = ['ko', 'en', 'ja', 'zh', 'zhTw', 'es', 'id'] as const;

/**
 * Radix Select cannot return to '', so a filter with no sentinel option is a one-way door:
 * pick 언어 = ja to check one send and every push after that is filtered to ja, including
 * the ko row just created, which looks like it vanished. Same 'ALL' sentinel + removable
 * chips the coupon list uses.
 */
const ALL = 'ALL';

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
  const [locale, setLocale] = useState<string>(ALL);
  const [status, setStatus] = useState<AdminPushStatus | typeof ALL>(ALL);
  const [sheet, setSheet] = useState<{ mode: 'create' | 'edit' | 'view'; row?: AdminPushItem } | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const {
    items: rawItems,
    totalPage,
    total,
    isLoading,
  } = usePushes({
    page,
    locale: locale === ALL ? undefined : [locale],
    status: status === ALL ? undefined : [status],
  });

  // A narrowed filter re-pages the whole result set, so holding page 4 renders an empty
  // table with nothing to explain it.
  useEffect(() => {
    setPage(1);
  }, [locale, status]);

  // A filtered campaign is stored as many rows; the list shows it as one so a single send
  // does not fill a page. Row actions still act on a real row, and cancel reaches the whole
  // group server-side.
  const items = useMemo(() => groupPushes(rawItems), [rawItems]);

  // view/edit track the live, polled row so a SENDING sheet's counts and countdown move
  // the same way the list behind it does. A duplicate is a snapshot the operator is
  // composing a fresh send from, so it must not drift if the original row changes later —
  // and it may have already scrolled off the current page by the time it does.
  const sheetRow =
    sheet?.row && sheet.mode !== 'create' ? (items.find((item) => item.id === sheet.row!.id) ?? sheet.row) : sheet?.row;

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

  const columns = createPushColumns(
    {
      onView: (row) => setSheet({ mode: 'view', row }),
      onEdit: (row) => setSheet({ mode: 'edit', row }),
      onDuplicate: (row) => setSheet({ mode: 'create', row }),
      onCancel: (row) => setPending({ kind: 'cancel', row }),
      onAbort: (row) => setPending({ kind: 'abort', row }),
      onDelete: (row) => setPending({ kind: 'delete', row }),
    },
    // The number of the page's first entry, counting down from the newest.
    total - (page - 1) * 10,
  );

  const confirmContent = pending ? confirmCopy[pending.kind](pending.row) : null;

  const chips = [
    ...(locale === ALL ? [] : [{ key: 'locale', label: `언어 ${locale}` }]),
    ...(status === ALL ? [] : [{ key: 'status', label: PUSH_STATUS_META[status].label }]),
  ];

  return (
    <>
      <FilterBar chips={chips} onRemoveChip={(key) => (key === 'locale' ? setLocale(ALL) : setStatus(ALL))}>
        <Select value={locale} onValueChange={setLocale}>
          <SelectTrigger className={`w-[120px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체 언어</SelectItem>
            {LOCALES.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v as AdminPushStatus | typeof ALL)}>
          <SelectTrigger className={`w-[140px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>전체 상태</SelectItem>
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
        pagination={{ total, page, pageSize: 10, onChange: setPage }}
      />

      {sheet && (
        <PushForm
          mode={sheet.mode}
          initial={sheetRow}
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
