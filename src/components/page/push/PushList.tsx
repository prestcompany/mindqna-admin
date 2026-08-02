import { AdminPush } from '@/client/push';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        if (value) return <Badge variant='dotSuccess'>활성</Badge>;
        if (!value) return <Badge variant='dotNeutral'>비활성</Badge>;
      },
    },
  ];
  return (
    <>
      <FilterBar>
        <Select
          value={(filter.locale ?? [])?.[0] ?? ''}
          onValueChange={(v: string) => {
            setFilter((prev) => ({ ...prev, locale: v ? [v] : undefined }));
          }}
        >
          <SelectTrigger className={`w-[120px] ${FILTER_CONTROL_CLASS}`}>
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
        <div className='flex-1' />
        <Button onClick={() => router.push('/marketing/push/new')} className={FILTER_CONTROL_CLASS}>
          푸시 등록
        </Button>
      </FilterBar>

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
    </>
  );
}

export default PushList;
