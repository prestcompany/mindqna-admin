import { removeCouponBatch, stopCouponBatch, type CouponBatch, type CouponStatus } from '@/client/coupon';
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
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import CouponCodeList from './CouponCodeList';
import { createCouponColumns } from './CouponColumns';
import CouponForm from './CouponForm';
import { errorMessage } from './errorMessage';

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
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { items, isLoading, refetch, totalPage } = useCoupons(
    currentPage,
    effectiveSearch,
    status === 'ALL' ? undefined : status,
  );
  const queryClient = useQueryClient();

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<CouponBatch | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<CouponBatch | undefined>(undefined);
  const [confirmStop, setConfirmStop] = useState<CouponBatch | undefined>(undefined);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveSearch, status]);

  const handleConfirmRemove = async () => {
    if (!confirmDelete) return;
    try {
      const result = await removeCouponBatch(confirmDelete.batchId);
      await Promise.all([
        refetch(),
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
      await refetch();
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

  return (
    <>
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
        expandable={{ expandedRowRender: (batch) => <CouponCodeList batch={batch} /> }}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />

      <Sheet open={isOpenCreate} onOpenChange={setOpenCreate}>
        <AdminSideSheetContent title='쿠폰 발급' size='md'>
          <CouponForm reload={refetch} close={() => setOpenCreate(false)} />
        </AdminSideSheetContent>
      </Sheet>

      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='쿠폰 수정' size='md'>
          <CouponForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
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
              만료일을 지금으로 변경해 더 이상 등록할 수 없게 합니다. 이미 지급된 보상은 회수되지 않습니다.
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
