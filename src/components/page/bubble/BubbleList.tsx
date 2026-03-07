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
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import useBubbles from '@/hooks/useBubbles';
import { ColumnDef } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import BubbleForm from './BubbleForm';

function BubbleList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{
    type?: BubbleType[];
    locale?: string[];
    level?: number;
  }>({});
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;
  const { items, totalPage, isLoading, refetch } = useBubbles({
    page: currentPage,
    type: filter.type,
    locale: filter.locale,
    level: filter.level,
    search: effectiveSearch,
  });

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filter.type, filter.locale, filter.level, effectiveSearch]);

  const columns: ColumnDef<PetBubble>[] = [
    {
      accessorKey: 'id',
      header: '번호',
      size: 72,
    },
    {
      accessorKey: 'message',
      header: '메시지',
      size: 360,
    },
    {
      accessorKey: 'level',
      header: '레벨',
      size: 80,
    },
    {
      accessorKey: 'type',
      header: '타입',
      size: 96,
    },
    {
      accessorKey: 'locale',
      header: '언어',
      size: 96,
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
        <div className='flex flex-wrap items-center gap-2 py-4'>
          <span className='text-lg font-bold'>필터</span>
          <div className='relative min-w-[240px]'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='메시지 검색 (2자 이상)'
              className='pl-9'
            />
          </div>
          <Select
            value={(filter.locale ?? [])?.[0] ?? '__all__'}
            onValueChange={(value: string) => {
              setFilter((prev) => ({ ...prev, locale: value === '__all__' ? undefined : [value] }));
            }}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='언어' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
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
            value={(filter.type ?? [])?.[0] ?? '__all__'}
            onValueChange={(value: string) => {
              setFilter((prev) => ({ ...prev, type: value === '__all__' ? undefined : [value as BubbleType] }));
            }}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='타입' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
              <SelectItem value='general'>공통</SelectItem>
              <SelectItem value='day'>오전</SelectItem>
              <SelectItem value='night'>오후</SelectItem>
              <SelectItem value='custom'>커스텀</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeof filter.level === 'number' ? String(filter.level) : '__all__'}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                level: value === '__all__' ? undefined : Number(value),
              }))
            }
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='레벨' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
                <SelectItem key={level} value={String(level)}>
                  Lv.{level}
                </SelectItem>
              ))}
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
