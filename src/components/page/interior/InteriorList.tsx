import { removeInteriorTemplate } from '@/client/interior';
import { ImgItem, InteriorTemplate, InteriorTemplateType } from '@/client/types';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import useInteriors from '@/hooks/useInteriors';
import useTotalRooms from '@/hooks/useTotalRooms';
import { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import InteriorForm from './InteriorForm';

function InteriorList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{
    room?: string;
    type?: InteriorTemplateType[];
  }>({});
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<InteriorTemplate | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<InteriorTemplate | undefined>(undefined);
  const { items: roomItems } = useTotalRooms();

  const { templates, totalPage, isLoading, refetch } = useInteriors({
    page: currentPage,
    room: filter.room,
    type: filter.type,
    search: effectiveSearch,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filter.room, filter.type, effectiveSearch]);

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
      size: 72,
    },
    {
      accessorKey: 'img',
      header: '이미지',
      size: 156,
      cell: ({ row }) => {
        const value = row.original.img as ImgItem;
        const rawWidth = row.original.width || 100;
        const rawHeight = row.original.height || 100;
        const maxPreview = 112;
        const scale = Math.min(maxPreview / rawWidth, maxPreview / rawHeight);
        const previewWidth = Math.max(Math.round(rawWidth * scale), 24);
        const previewHeight = Math.max(Math.round(rawHeight * scale), 24);

        return (
          <ClickableImagePreview
            src={value?.uri}
            alt={`${row.original.name} 인테리어 이미지`}
            triggerClassName='h-[120px] w-[120px]'
            imageClassName='object-contain'
            imageStyle={{
              width: previewWidth,
              height: previewHeight,
            }}
          />
        );
      },
    },
    {
      accessorKey: 'name',
      header: '이름',
      size: 180,
    },
    {
      accessorKey: 'type',
      header: '타입',
      size: 110,
    },
    {
      accessorKey: 'room',
      header: '방 타입',
      size: 140,
    },
    {
      accessorKey: 'category',
      header: '카테고리',
      size: 150,
    },
    {
      accessorKey: 'price',
      header: '가격',
      size: 90,
    },
    {
      accessorKey: 'isPaid',
      header: '스타/하트',
      size: 100,
      cell: ({ row }) => {
        const value = row.original.isPaid;
        return <Badge variant={value ? 'warning' : 'destructive'}>{value ? '스타' : '하트'}</Badge>;
      },
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      size: 90,
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'success' : 'destructive'}>{value ? '활성' : '비활성'}</Badge>;
      },
    },
    {
      accessorKey: 'width',
      header: 'width',
      size: 72,
    },
    {
      accessorKey: 'height',
      header: 'height',
      size: 72,
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
            <AlertDialogTitle>삭제 {confirmTarget?.name}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DefaultTableBtn className='justify-between'>
        <div className='flex flex-wrap items-center gap-2 py-4'>
          <div className='relative min-w-[240px]'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder='이름/카테고리 검색 (2자 이상)'
              className='pl-9'
            />
          </div>
          <Select
            value={filter.room ?? '__all__'}
            onValueChange={(value) => setFilter((prev) => ({ ...prev, room: value === '__all__' ? undefined : value }))}
          >
            <SelectTrigger className='w-[160px]'>
              <SelectValue placeholder='방 타입' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체 방</SelectItem>
              {roomItems.map((item) => (
                <SelectItem key={item.type} value={item.type}>
                  {item.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={(filter.type ?? [])?.[0] ?? '__all__'}
            onValueChange={(value) =>
              setFilter((prev) => ({
                ...prev,
                type: value === '__all__' ? undefined : [value as InteriorTemplateType],
              }))
            }
          >
            <SelectTrigger className='w-[150px]'>
              <SelectValue placeholder='타입' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체 타입</SelectItem>
              <SelectItem value='item'>아이템</SelectItem>
              <SelectItem value='wall'>벽지</SelectItem>
              <SelectItem value='floor'>바닥</SelectItem>
              <SelectItem value='todayFrame'>오늘 프레임</SelectItem>
              <SelectItem value='event'>이벤트</SelectItem>
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
        <AdminSideSheetContent title='인테리어 추가' size='lg'>
          <InteriorForm reload={refetch} close={() => setOpenCreate(false)} />
        </AdminSideSheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='인테리어 수정' size='lg'>
          <InteriorForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

export default InteriorList;
