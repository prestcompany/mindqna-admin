import { removeInteriorTemplate } from '@/client/interior';
import { ImgItem, InteriorTemplate } from '@/client/types';
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
import useInteriors from '@/hooks/useInteriors';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import InteriorForm from './InteriorForm';

function InteriorList() {
  const [currentPage, setCurrentPage] = useState(1);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<InteriorTemplate | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<InteriorTemplate | undefined>(undefined);

  const { templates, totalPage, isLoading, refetch } = useInteriors({ page: currentPage });

  const handleEdit = (value: InteriorTemplate) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: InteriorTemplate) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    try {
      await removeInteriorTemplate(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  const columns: ColumnDef<InteriorTemplate>[] = [
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'img',
      header: '이미지',
      cell: ({ row }) => {
        const value = row.original.img as ImgItem;
        return <img width='100%' height={100} src={value?.uri ?? ''} alt='img' className='object-contain' />;
      },
    },
    {
      accessorKey: 'name',
      header: '이름',
    },
    {
      accessorKey: 'type',
      header: '타입',
    },
    {
      accessorKey: 'room',
      header: '방 타입',
    },
    {
      accessorKey: 'category',
      header: '카테고리',
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
      header: '상태',
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'success' : 'destructive'}>{value ? '활성' : '비활성'}</Badge>;
      },
    },
    {
      accessorKey: 'width',
      header: 'width',
    },
    {
      accessorKey: 'height',
      header: 'height',
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
            <AlertDialogTitle>삭제 {confirmTarget?.name}</AlertDialogTitle>
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
        data={templates ?? []}
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
            <SheetTitle>인테리어 추가</SheetTitle>
          </SheetHeader>
          <InteriorForm reload={refetch} close={() => setOpenCreate(false)} />
        </SheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <SheetContent side='right' className='w-[720px] sm:max-w-[720px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>인테리어 수정</SheetTitle>
          </SheetHeader>
          <InteriorForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default InteriorList;
