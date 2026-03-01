import { Coupon, removeCoupon } from '@/client/coupon';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
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
import { useState } from 'react';
import { toast } from 'sonner';
import CouponForm from './CouponForm';

function CouponList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { items, isLoading, refetch, totalPage } = useCoupons(currentPage);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<Coupon | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Coupon | undefined>(undefined);

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
    },
    {
      accessorKey: 'name',
      header: '이름',
    },
    {
      accessorKey: 'code',
      header: 'code',
    },
    {
      accessorKey: 'heart',
      header: '히트',
      cell: ({ row }) => {
        return <Badge variant='destructive'>{row.original.heart}</Badge>;
      },
    },
    {
      accessorKey: 'star',
      header: '스타',
      cell: ({ row }) => {
        return <Badge variant='warning'>{row.original.star}</Badge>;
      },
    },
    {
      accessorKey: 'ticketCount',
      header: '티켓 수',
      cell: ({ row }) => {
        return <Badge variant='default'>{row.original.ticketCount}</Badge>;
      },
    },
    {
      accessorKey: 'ticketDueDayNum',
      header: '티켓 혜택 일',
      cell: ({ row }) => {
        return <Badge variant='default'>{row.original.ticketDueDayNum}</Badge>;
      },
    },
    {
      accessorKey: 'dueAt',
      header: '만료일',
      cell: ({ row }) => {
        const value = row.original.dueAt;
        const day = dayjs(value);
        return <div>{value ? day.format('YY.MM.DD HH:mm') : ''}</div>;
      },
    },
    {
      accessorKey: 'username',
      header: '사용',
      cell: ({ row }) => {
        return <div> {row.original.username || '미사용'}</div>;
      },
    },
    {
      id: 'actions',
      header: '관리',
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
      <DefaultTableBtn className='justify-end'>
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
