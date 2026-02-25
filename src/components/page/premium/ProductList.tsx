import { IAPProduct } from '@/client/premium';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/shared/ui/data-table';
import useProducts from '@/hooks/useProducts';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useState } from 'react';

function ProductList() {
  const [currentPage, setCurrentPage] = useState(1);

  const { items, isLoading, totalPage } = useProducts({
    page: currentPage,
  });

  const columns: ColumnDef<IAPProduct>[] = [
    {
      accessorKey: 'id',
      header: '번호',
      size: 72,
    },
    {
      id: 'username',
      accessorFn: (row) => (row as any).owner?.username ?? '-',
      header: 'username',
      size: 170,
      meta: {
        truncateMaxWidth: 150,
      },
    },
    {
      accessorKey: 'platform',
      header: '플랫폼',
      size: 92,
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
      size: 110,
      cell: ({ row }) => {
        const value = row.original.dueAt;
        return <Badge variant={value ? 'info' : 'secondary'}>{value ? '구독' : '소모품'}</Badge>;
      },
    },
    {
      id: 'productId',
      accessorFn: (row) => row.productId ?? '-',
      header: 'productId',
      size: 210,
      meta: {
        truncateMaxWidth: 190,
      },
    },
    {
      id: 'transactionId',
      accessorFn: (row) => row.transactionId ?? '-',
      header: 'transactionId',
      size: 220,
      meta: {
        truncateMaxWidth: 200,
      },
    },
    {
      accessorKey: 'dueAt',
      header: '만료일',
      size: 130,
      cell: ({ row }) => {
        const value = row.original.dueAt;
        const day = dayjs(value);
        return <div> {value ? day.format('YY.MM.DD HH:mm') : ''}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: '활성화',
      size: 92,
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'success' : 'muted'}>{value ? '활성화' : '만료'}</Badge>;
      },
    },
    {
      accessorKey: 'isProduction',
      header: 'PROD/TEST',
      size: 104,
      cell: ({ row }) => {
        const value = row.original.isProduction;
        return <Badge variant={value ? 'default' : 'muted'}>{value ? 'PROD' : 'TEST'}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '생성 시간',
      size: 140,
      cell: ({ row }) => {
        const day = dayjs(row.original.createdAt);
        return <div>{day.format('YY.MM.DD HH:mm')}</div>;
      },
    },
  ];
  return (
    <>
      <DefaultTableBtn className='justify-start'>
        <span className='text-sm font-medium text-muted-foreground'>상품 결제 내역</span>
      </DefaultTableBtn>
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
