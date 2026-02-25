import { Banner, removeBanner } from '@/client/banner';
import { BannerLocationType } from '@/client/types';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import useBanners from '@/hooks/useBanners';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import BannerForm, { locationOptions } from './BannerForm';

function BannerList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ location?: BannerLocationType[]; locale?: string[] }>({});
  const { items, isLoading, refetch, totalPage } = useBanners({ page: currentPage, ...filter });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<Banner | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Banner | undefined>(undefined);

  const handleEdit = (value: Banner) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: Banner) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    try {
      await removeBanner(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  const columns: ColumnDef<Banner>[] = [
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'imgUri',
      header: '이미지',
      cell: ({ row }) => {
        const value = row.original.imgUri;
        return <img width='100%' height={60} src={value ?? ''} alt='img' className='object-contain' />;
      },
    },
    {
      accessorKey: 'name',
      header: '이름',
    },
    {
      accessorKey: 'locale',
      header: '다국어',
    },
    {
      accessorKey: 'location',
      header: '위치',
      cell: ({ row }) => {
        const value = row.original.location;
        const label = locationOptions.find((item) => item.value === value)?.label ?? value;
        return <Badge variant='info'>{label}</Badge>;
      },
    },
    {
      accessorKey: 'viewCount',
      header: '조회수',
    },
    {
      accessorKey: 'clickCount',
      header: '클릭수',
    },
    {
      accessorKey: 'link',
      header: '링크',
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
          <Button variant='outline' onClick={() => handleEdit(row.original)}>
            수정
          </Button>
          <Button variant='outline' onClick={() => handleRemove(row.original)}>
            삭제
          </Button>
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
      <DefaultTableBtn className='justify-between'>
        <div className='flex gap-2 items-center py-4'>
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
            value={(filter.location ?? [])?.[0] ?? ''}
            onValueChange={(v: string) => {
              setFilter((prev) => ({ ...prev, location: v ? [v as BannerLocationType] : undefined }));
            }}
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='타입' />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
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
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>배너 추가</SheetTitle>
          </SheetHeader>
          <BannerForm reload={refetch} close={() => setOpenCreate(false)} />
        </SheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>배너 수정</SheetTitle>
          </SheetHeader>
          <BannerForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default BannerList;
