import { removeSnack } from '@/client/snack';
import { ImgItem, Snack } from '@/client/types';
import DataTable from '@/components/shared/ui/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import useSnacks from '@/hooks/useSnack';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import SnackForm from './SnackForm';

function SnackList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { items, totalPage, isLoading, refetch } = useSnacks(currentPage);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<Snack | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Snack | undefined>(undefined);

  const handleEdit = (value: Snack) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: Snack) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    try {
      await removeSnack(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  const columns: ColumnDef<Snack>[] = [
    {
      accessorKey: 'Img',
      header: '이미지',
      cell: ({ row }) => {
        const value = row.original.Img as ImgItem;
        return <img width='100%' height={60} src={value?.uri ?? ''} alt='img' className='object-contain' />;
      },
    },
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'name',
      header: '이름',
    },
    {
      accessorKey: 'desc',
      header: '설명',
    },
    {
      accessorKey: 'kind',
      header: '종류',
    },
    {
      accessorKey: 'type',
      header: '진화하는 펫',
    },
    {
      accessorKey: 'exp',
      header: '경험치',
    },
    {
      accessorKey: 'order',
      header: '순서',
    },
    {
      accessorKey: 'price',
      header: '가격',
    },
    {
      accessorKey: 'isPaid',
      header: '스타/하트',
      cell: ({ row }) => {
        const value = row.original.isPaid;
        return <Badge variant={value ? 'warning' : 'destructive'}>{value ? '스타' : '하트'}</Badge>;
      },
    },
    {
      accessorKey: 'isActive',
      header: '활성화',
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'success' : 'muted'}>{value ? '활성화' : '비활성화'}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Action',
      cell: ({ row }) => (
        <div className='flex gap-4'>
          <Button variant='outline' onClick={() => handleEdit(row.original)}>수정</Button>
          <Button variant='outline' onClick={() => handleRemove(row.original)}>삭제</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 ({confirmTarget?.name})</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button
        onClick={() => {
          setFocused(undefined);
          setOpenCreate(true);
        }}
        size='lg'
      >
        추가
      </Button>
      <DataTable
        columns={columns}
        data={items ?? []}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />
      <Sheet open={isOpenCreate} onOpenChange={setOpenCreate}>
        <SheetContent side='right' className='w-[720px] sm:max-w-[720px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>간식 추가</SheetTitle>
          </SheetHeader>
          <SnackForm close={() => setOpenCreate(false)} reload={refetch} />
        </SheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <SheetContent side='right' className='w-[720px] sm:max-w-[720px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>간식 수정</SheetTitle>
          </SheetHeader>
          <SnackForm initialSnack={focused} close={() => setOpenEdit(false)} reload={refetch} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default SnackList;
