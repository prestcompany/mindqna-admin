import { removeBubble } from '@/client/bubble';
import { BubbleType, PetBubble } from '@/client/types';
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
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
            <AlertDialogTitle>삭제 ({confirmTarget?.message})</AlertDialogTitle>
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
            <SheetTitle>말풍선 추가</SheetTitle>
          </SheetHeader>
          <BubbleForm reload={refetch} close={() => setOpenCreate(false)} />
        </SheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>말풍선 수정</SheetTitle>
          </SheetHeader>
          <BubbleForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default BubbleList;
