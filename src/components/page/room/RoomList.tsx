import { RoomCategory, RoomTemplate, removeRoom } from '@/client/room';
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
import useRooms from '@/hooks/useRooms';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import RoomForm, { categoryOptions } from './RoomForm';

function RoomList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { items, isLoading, refetch, totalPage } = useRooms(currentPage);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<RoomTemplate | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<RoomTemplate | undefined>(undefined);

  const handleEdit = (value: RoomTemplate) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: RoomTemplate) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    try {
      await removeRoom(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  const columns: ColumnDef<RoomTemplate>[] = [
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'type',
      header: '이름',
    },
    {
      accessorKey: 'category',
      header: '카테고리',
      cell: ({ row }) => {
        const value = row.original.category as RoomCategory;
        const v = categoryOptions.find((item) => item.value === value)?.label ?? value;
        return <Badge variant='secondary'>{v}</Badge>;
      },
    },
    {
      accessorKey: 'price',
      header: '가격',
    },
    {
      accessorKey: 'isPaid',
      header: '스타/히트',
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
            <AlertDialogTitle>삭제 ({confirmTarget?.type})</AlertDialogTitle>
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
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>방 추가</SheetTitle>
          </SheetHeader>
          <RoomForm reload={refetch} close={() => setOpenCreate(false)} />
        </SheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>방 수정</SheetTitle>
          </SheetHeader>
          <RoomForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default RoomList;
