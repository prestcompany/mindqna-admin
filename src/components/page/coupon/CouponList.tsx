import { Coupon, removeCoupon } from '@/client/coupon';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import useDebouncedValue from '@/hooks/useDebouncedValue';
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
import useCoupons from '@/hooks/useCoupons';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import CouponForm from './CouponForm';

function CouponList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;
  const { items, isLoading, refetch, totalPage } = useCoupons(currentPage, effectiveSearch);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<Coupon | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Coupon | undefined>(undefined);

  useEffect(() => {
    setCurrentPage(1);
  }, [effectiveSearch]);

  const handleEdit = (value: Coupon) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: Coupon) => {
    setConfirmDelete(value);
  };

  const handleConfirmRemove = async () => {
    if (!confirmDelete) return;
    try {
      await removeCoupon(confirmDelete.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmDelete(undefined);
  };

  const columns: ColumnDef<Coupon>[] = [
    {
      accessorKey: 'id',
      header: '번호',
      size: 72,
    },
    {
      accessorKey: 'name',
      header: '이름',
      size: 180,
    },
    {
      accessorKey: 'code',
      header: 'code',
      size: 180,
    },
    {
      accessorKey: 'heart',
      header: '히트',
      size: 90,
      cell: ({ row }) => {
        return <Badge variant='destructive'>{row.original.heart}</Badge>;
      },
    },
    {
      accessorKey: 'star',
      header: '스타',
      size: 90,
      cell: ({ row }) => {
        return <Badge variant='warning'>{row.original.star}</Badge>;
      },
    },
    {
      accessorKey: 'ticketCount',
      header: '티켓 수',
      size: 96,
      cell: ({ row }) => {
        return <Badge variant='default'>{row.original.ticketCount}</Badge>;
      },
    },
    {
      accessorKey: 'ticketDueDayNum',
      header: '티켓 혜택 일',
      size: 120,
      cell: ({ row }) => {
        return <Badge variant='default'>{row.original.ticketDueDayNum}</Badge>;
      },
    },
    {
      accessorKey: 'dueAt',
      header: '만료일',
      size: 140,
      cell: ({ row }) => {
        const value = row.original.dueAt;
        const day = dayjs(value);
        return <div>{value ? day.format('YY.MM.DD HH:mm') : ''}</div>;
      },
    },
    {
      accessorKey: 'username',
      header: '사용',
      size: 160,
      cell: ({ row }) => {
        return <div> {row.original.username || '미사용'}</div>;
      },
    },
    {
      id: 'actions',
      header: '관리',
      size: 92,
      cell: ({ row }) => (
        <TableRowActions
          items={[
            {
              label: '수정',
              onClick: () => handleEdit(row.original),
            },
            {
              label: '삭제',
              onClick: () => handleRemove(row.original),
              destructive: true,
            },
          ]}
        />
      ),
    },
  ];
  return (
    <>
      <DefaultTableBtn className='justify-between'>
        <div className='relative min-w-[260px] py-4'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='쿠폰명 / 코드 / 사용자 검색 (2자 이상)'
            className='pl-9'
          />
        </div>
        <Button
          onClick={() => {
            setFocused(undefined);
            setOpenCreate(true);
          }}
          size='lg'
        >
          추가
        </Button>
      </DefaultTableBtn>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />
      <Sheet open={isOpenCreate} onOpenChange={setOpenCreate}>
        <AdminSideSheetContent title='쿠폰 추가' size='md'>
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
              이 쿠폰을 정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default CouponList;
