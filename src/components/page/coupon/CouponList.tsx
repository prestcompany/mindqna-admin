import {
  removeCouponBatch,
  stopCouponBatch,
  type CouponBatch,
  type CouponSort,
  type CouponStatus,
} from '@/client/coupon';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import useCoupons from '@/hooks/useCoupons';
import useCouponSummary from '@/hooks/useCouponSummary';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import CouponCodeList from './CouponCodeList';
import { createCouponColumns } from './CouponColumns';
import CouponForm from './CouponForm';
import CouponSummaryStrip from './CouponSummaryStrip';
import { errorMessage } from './errorMessage';

const SORT_OPTIONS: { value: CouponSort; label: string }[] = [
  { value: 'RECENT', label: '최근 발급순' },
  { value: 'USAGE', label: '사용률순' },
  { value: 'ENDING', label: '종료 임박순' },
];

const STATUS_OPTIONS: { value: CouponStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체 상태' },
  { value: 'ACTIVE', label: '진행중' },
  { value: 'SCHEDULED', label: '예정' },
  { value: 'EXHAUSTED', label: '소진' },
  { value: 'EXPIRED', label: '만료' },
];

function CouponList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<CouponStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<CouponSort>('RECENT');
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { items, isLoading, refetch, totalPage } = useCoupons(
    currentPage,
    effectiveSearch,
    status === 'ALL' ? undefined : status,
    sort,
  );
  const { summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useCouponSummary();
  const queryClient = useQueryClient();

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<CouponBatch | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<CouponBatch | undefined>(undefined);
  const [confirmStop, setConfirmStop] = useState<CouponBatch | undefined>(undefined);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveSearch, status, sort]);

  // Deleting every batch on the last page shrinks the list under the page the admin is
  // standing on. The refetch then returns an empty array for a page that no longer exists,
  // and the table shows its empty state as if the whole list were gone. Clamp instead of
  // resetting to 1: a delete on page 3 of 5 should leave the admin on page 3.
  useEffect(() => {
    // Floor at 1 so emptying the list entirely (totalPage 0) lands on page 1, not page 0.
    const lastPage = Math.max(1, totalPage);
    if (!isLoading && currentPage > lastPage) setCurrentPage(lastPage);
  }, [isLoading, currentPage, totalPage]);

  const handleConfirmRemove = async () => {
    if (!confirmDelete) return;
    try {
      const result = await removeCouponBatch(confirmDelete.batchId);
      await Promise.all([
        refetch(),
        // The strip counts the whole table, so a delete moves it even when the row that
        // vanished was not on this page.
        refetchSummary(),
        // The code list lives under its own query key and survives a delete that
        // still keeps the batch (kept > 0), so it never refetches on its own —
        // invalidate it explicitly or an expanded row keeps showing deleted codes.
        queryClient.invalidateQueries({ queryKey: ['coupon-batch-codes', confirmDelete.batchId] }),
      ]);
      toast.success(
        result.kept > 0
          ? `미사용 ${result.deleted}장을 삭제했습니다. 사용된 ${result.kept}장은 이력 보존을 위해 남겼습니다.`
          : `${result.deleted}장을 삭제했습니다.`,
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
    setConfirmDelete(undefined);
  };

  const handleConfirmStop = async () => {
    if (!confirmStop) return;
    try {
      await stopCouponBatch(confirmStop.batchId);
      await Promise.all([refetch(), refetchSummary()]);
      toast.success('쿠폰 발급을 중단했습니다.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
    setConfirmStop(undefined);
  };

  const columns = useMemo(
    () =>
      createCouponColumns({
        onEdit: (batch) => {
          setFocused(batch);
          setOpenEdit(true);
        },
        onStop: (batch) => setConfirmStop(batch),
        onDelete: (batch) => setConfirmDelete(batch),
      }),
    [],
  );

  const hasFilters = !!effectiveSearch || status !== 'ALL';
  // Issuing or editing changes the whole-table counts too, not just this page.
  const reloadAll = async () => {
    await Promise.all([refetch(), refetchSummary()]);
  };

  return (
    <>
      <CouponSummaryStrip summary={summary} isLoading={isSummaryLoading} />

      <FilterBar
        chips={
          status === 'ALL'
            ? []
            : [{ key: 'status', label: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? '상태' }]
        }
        onRemoveChip={() => setStatus('ALL')}
      >
        <div className='relative min-w-[260px]'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='쿠폰명 / 코드 / 사용자 검색 (2자 이상)'
            className={`pl-9 ${FILTER_CONTROL_CLASS}`}
          />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as CouponStatus | 'ALL')}>
          <SelectTrigger className={`w-[140px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as CouponSort)}>
          <SelectTrigger className={`w-[150px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex-1' />
        <Button
          onClick={() => {
            setFocused(undefined);
            setOpenCreate(true);
          }}
          className={FILTER_CONTROL_CLASS}
        >
          추가
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        rowKey='batchId'
        expandable={{
          expandedRowRender: (batch) => <CouponCodeList batch={batch} />,
          expandOnRowClick: true,
        }}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
        // A filtered-empty list and a never-used list need opposite next actions, so they
        // must not share one message.
        emptyState={
          hasFilters ? (
            <div className='space-y-2 py-4'>
              <div className='text-slate-900'>
                {effectiveSearch ? `‘${effectiveSearch}’에 해당하는 쿠폰이 없습니다` : '조건에 맞는 쿠폰이 없습니다'}
              </div>
              <div className='text-slate-500'>쿠폰명 · 코드 · 사용자명으로 검색합니다.</div>
              <Button
                variant='outline'
                size='sm'
                className='h-8'
                onClick={() => {
                  setSearchInput('');
                  setStatus('ALL');
                }}
              >
                검색 초기화
              </Button>
            </div>
          ) : (
            <div className='space-y-2 py-4'>
              <div className='text-slate-900'>아직 발급한 쿠폰이 없습니다</div>
              <div className='text-slate-500'>개별 코드는 1인 1코드, 공용 코드는 하나를 여럿이 사용합니다.</div>
              <Button
                size='sm'
                className='h-8'
                onClick={() => {
                  setFocused(undefined);
                  setOpenCreate(true);
                }}
              >
                첫 쿠폰 발급
              </Button>
            </div>
          )
        }
      />

      <Sheet open={isOpenCreate} onOpenChange={setOpenCreate}>
        {/* The form owns the scroll/footer split, so the sheet hands it the raw height. */}
        {/* lg (720px): the form keeps a 140px label column and a 220px summary rail, which
            an md sheet cannot hold without squeezing the inputs. */}
        <AdminSideSheetContent title='쿠폰 발급' size='lg' bodyClassName='overflow-hidden p-0'>
          <CouponForm reload={reloadAll} close={() => setOpenCreate(false)} />
        </AdminSideSheetContent>
      </Sheet>

      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='쿠폰 수정' size='lg' bodyClassName='overflow-hidden p-0'>
          <CouponForm init={focused} reload={reloadAll} close={() => setOpenEdit(false)} />
        </AdminSideSheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 ({confirmDelete?.name})</AlertDialogTitle>
            <AlertDialogDescription>
              아직 사용되지 않은 코드만 삭제됩니다. 이미 사용된 코드는 이력 보존을 위해 남습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmStop} onOpenChange={(open) => !open && setConfirmStop(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>발급 중단 ({confirmStop?.name})</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmStop?.status === 'SCHEDULED'
                ? '아직 시작되지 않은 쿠폰입니다. 시작 전에 종료 처리해 등록할 수 없게 합니다.'
                : '만료일을 지금으로 변경해 더 이상 등록할 수 없게 합니다. 이미 지급된 보상은 회수되지 않습니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStop}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CouponList;
