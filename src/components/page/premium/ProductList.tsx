import type { IAPProduct } from '@/client/premium';
import DataTable from '@/components/shared/ui/data-table';
import { Badge } from '@/components/ui/badge';
import useProducts from '@/hooks/useProducts';
import type { ColumnDef } from '@tanstack/react-table';
import type { PurchaseDetailContext } from './PurchaseDetailSheet';
import {
  DateTimeCell,
  EnvironmentBadge,
  IdentifierCell,
  PlatformBadge,
  ProductKindBadge,
  UserCell,
} from './PurchaseTableCells';
import type { PaymentFilters } from './purchase-filters';

const columns: ColumnDef<IAPProduct>[] = [
  {
    id: 'user',
    header: '유저',
    size: 140,
    cell: ({ row }) => <UserCell username={row.original.owner?.username} userId={row.original.ownerId} />,
  },
  {
    accessorKey: 'platform',
    header: '플랫폼',
    size: 90,
    cell: ({ row }) => <PlatformBadge platform={row.original.platform} />,
  },
  {
    id: 'kind',
    header: '유형',
    size: 85,
    cell: ({ row }) => <ProductKindBadge isSubscribe={row.original.isSubscribe} />,
  },
  {
    accessorKey: 'productId',
    header: '상품 ID',
    size: 205,
    cell: ({ row }) => <IdentifierCell value={row.original.productId} label='상품 ID' />,
  },
  {
    accessorKey: 'transactionId',
    header: '결제 ID',
    size: 210,
    cell: ({ row }) => <IdentifierCell value={row.original.transactionId} label='결제 ID' />,
  },
  {
    accessorKey: 'isActive',
    header: '상태',
    size: 85,
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'dotSuccess' : 'dotNeutral'}>
        {row.original.isActive ? '활성' : '만료'}
      </Badge>
    ),
  },
  {
    accessorKey: 'isProduction',
    header: '환경',
    size: 85,
    cell: ({ row }) => <EnvironmentBadge isProduction={row.original.isProduction} />,
  },
  {
    accessorKey: 'createdAt',
    header: '생성 시간',
    size: 130,
    cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
  },
  {
    accessorKey: 'dueAt',
    header: '만료일',
    size: 130,
    cell: ({ row }) => <DateTimeCell value={row.original.dueAt} />,
  },
];

function ProductList({
  filters,
  page,
  onPageChange,
  onOpenDetail,
}: {
  filters: PaymentFilters;
  page: number;
  onPageChange: (page: number) => void;
  onOpenDetail: (ctx: PurchaseDetailContext) => void;
}) {
  const { items, isLoading, totalPage } = useProducts({
    page,
    search: filters.search,
    startDate: filters.startDate,
    endDate: filters.endDate,
    isActive: filters.entitlementStatus === undefined ? undefined : filters.entitlementStatus === 'active',
    isSubscribe: filters.isSubscribe,
    platform: filters.platform,
    isProduction: filters.isProduction,
  });

  return (
    <DataTable
      columns={columns}
      data={items}
      loading={isLoading}
      onRow={(record) => ({ onClick: () => onOpenDetail({ type: 'ticket', ticket: record }) })}
      pagination={{
        total: totalPage * 20,
        page,
        pageSize: 20,
        onChange: onPageChange,
      }}
    />
  );
}

export default ProductList;
