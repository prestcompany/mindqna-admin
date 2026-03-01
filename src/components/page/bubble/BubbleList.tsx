import { removeBubble } from '@/client/bubble';
import { BubbleType, PetBubble } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
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
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import useBubbles from '@/hooks/useBubbles';
import { ColumnDef } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';
import BubbleForm from './BubbleForm';

function BubbleList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ type?: BubbleType[]; locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useBubbles(currentPage, filter.type, filter.locale);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<PetBubble | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<PetBubble | undefined>(undefined);

  const handleEdit = (value: PetBubble) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: PetBubble) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    try {
      await removeBubble(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  const columns: ColumnDef<PetBubble>[] = [
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'message',
      header: 'message',
    },
    {
      accessorKey: 'level',
      header: '레벨',
    },
    {
      accessorKey: 'type',
      header: '타입',
    },
    {
      accessorKey: 'locale',
      header: 'locale',
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
            <AlertDialogTitle>삭제 ({confirmTarget?.message})</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DefaultTableBtn className='justify-between'>
        <div className='flex items-center gap-2 py-4'>
          <span className='text-lg font-bold'>필터</span>
          <Select
            value={(filter.locale ?? [])?.[0] ?? ''}
            onValueChange={(v: string) => {
              setFilter((prev) => ({ ...prev, locale: v ? [v] : undefined }));
            }}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='언어' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ko'>ko</SelectItem>
              <SelectItem value='en'>en</SelectItem>
              <SelectItem value='ja'>ja</SelectItem>
              <SelectItem value='zh'>zh</SelectItem>
              <SelectItem value='zhTw'>zhTw</SelectItem>
              <SelectItem value='es'>es</SelectItem>
              <SelectItem value='id'>id</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={(filter.type ?? [])?.[0] ?? ''}
            onValueChange={(v: string) => {
              setFilter((prev) => ({ ...prev, type: v ? [v as BubbleType] : undefined }));
            }}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='타입' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='general'>공통</SelectItem>
              <SelectItem value='day'>오전</SelectItem>
              <SelectItem value='night'>오후</SelectItem>
              <SelectItem value='custom'>커스텀</SelectItem>
            </SelectContent>
          </Select>
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
        <AdminSideSheetContent title='말풍선 추가' size='md'>
          <BubbleForm reload={refetch} close={() => setOpenCreate(false)} />
        </AdminSideSheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='말풍선 수정' size='md'>
          <BubbleForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

export default BubbleList;
