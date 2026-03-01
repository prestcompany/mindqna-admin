import { removeSnack } from '@/client/snack';
import { ImgItem, Snack } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import ClickableImagePreview from '@/components/shared/ui/clickable-image-preview';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import TableRowActions from '@/components/shared/ui/table-row-actions';
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
import { Sheet } from '@/components/ui/sheet';
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
      accessorKey: 'id',
      header: '번호',
      size: 84,
    },
    {
      accessorKey: 'Img',
      header: '이미지',
      size: 156,
      cell: ({ row }) => {
        const value = row.original.Img as ImgItem;
        return (
          <ClickableImagePreview
            src={value?.uri}
            alt={`${row.original.name} 간식 이미지`}
            triggerClassName='h-[120px] w-[120px]'
            imageClassName='h-full w-full object-contain'
          />
        );
      },
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
        <AdminSideSheetContent title='간식 추가' size='lg'>
          <SnackForm close={() => setOpenCreate(false)} reload={refetch} />
        </AdminSideSheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='간식 수정' size='lg'>
          <SnackForm initialSnack={focused} close={() => setOpenEdit(false)} reload={refetch} />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

export default SnackList;
