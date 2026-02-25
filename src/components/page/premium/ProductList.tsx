import { IAPProduct } from '@/client/premium';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/shared/ui/data-table';
import useProducts from '@/hooks/useProducts';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useState } from 'react';

function ProductList() {
  const [currentPage, setCurrentPage] = useState(1);

  const { items, isLoading, refetch, totalPage } = useProducts({
    page: currentPage,
  });

  const columns: ColumnDef<IAPProduct>[] = [
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      id: 'username',
      accessorFn: (row) => (row as any).owner?.username,
      header: 'username',
    },
    {
      accessorKey: 'platform',
      header: '플랫폼',
      cell: ({ row }) => {
        const value = row.original.platform;
        if (value === 'EVENT') return <Badge variant='destructive'>EVENT</Badge>;
        if (value === 'IOS') return <Badge variant='secondary'>IOS</Badge>;
        if (value === 'AOS') return <Badge variant='success'>AOS</Badge>;
      },
    },
    {
      id: 'subscription',
      accessorKey: 'dueAt',
      header: '구독/소모품',
      cell: ({ row }) => {
        const value = row.original.dueAt;
        return <Badge variant={value ? 'info' : 'secondary'}>{value ? '구독' : '소모품'}</Badge>;
      },
    },
    {
      accessorKey: 'productId',
      header: 'productId',
    },
    {
      accessorKey: 'transactionId',
      header: 'transactionId',
    },
    {
      accessorKey: 'dueAt',
      header: '만료일',
      cell: ({ row }) => {
        const value = row.original.dueAt;
        const day = dayjs(value);
        return <div> {value ? day.format('YY.MM.DD HH:mm') : ''}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: '활성화',
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'success' : 'muted'}>{value ? '활성화' : '만료'}</Badge>;
      },
    },
    {
      accessorKey: 'isProduction',
      header: 'PROD/TEST',
      cell: ({ row }) => {
        const value = row.original.isProduction;
        return <Badge variant={value ? 'default' : 'muted'}>{value ? 'PROD' : 'TEST'}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '생성 시간',
      cell: ({ row }) => {
        const day = dayjs(row.original.createdAt);
        return <div>{day.format('YY.MM.DD HH:mm')}</div>;
      },
    },
  ];
  return (
    <>
      <div className='flex gap-2 items-center py-4'>
        <span className='text-lg font-bold'>필터</span>
      </div>
      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          onChange: (page) => setCurrentPage(page),
        }}
      />
    </>
  );
}

export default ProductList;
