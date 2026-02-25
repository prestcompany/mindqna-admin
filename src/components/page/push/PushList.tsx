import { AdminPush } from '@/client/push';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import usePushes from '@/hooks/usePushes';
import { ColumnDef } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/router';
import { useState } from 'react';

function PushList() {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = usePushes({ page: currentPage, locale: filter.locale });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

  const columns: ColumnDef<AdminPush>[] = [
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'locale',
      header: '언어',
    },
    {
      accessorKey: 'title',
      header: '제목',
    },
    {
      accessorKey: 'message',
      header: '메시지',
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      cell: ({ row }) => {
        const value = row.original.isActive;
        if (value) return <Badge variant='success'>활성</Badge>;
        if (!value) return <Badge variant='destructive'>비활성</Badge>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className='flex gap-4'>
          {/* <Button variant='outline' onClick={() => handleEdit(row.original)}>상태변경</Button> */}
          {/* <Button variant='outline' onClick={() => handleRemove(row.original)}>삭제</Button> */}
        </div>
      ),
    },
  ];
  return (
    <>
      <DefaultTableBtn className='justify-between'>
        <div>
          <div className='flex items-center gap-2 py-6 '>
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
          </div>
        </div>
        <div className='flex-item-list'>
          <Button onClick={() => router.push('/marketing/push/new')}>
            푸시 등록
          </Button>
        </div>
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
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px]' />
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px]' />
      </Sheet>
    </>
  );
}

export default PushList;
