import type { PurchaseMeta } from '@/client/types';
import { resolveStatus } from '@/components/shared/purchase/purchase-status';
import DataTable from '@/components/shared/ui/data-table';
import { Badge } from '@/components/ui/badge';
import usePurchases from '@/hooks/usePurchase';
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

const columns: ColumnDef<PurchaseMeta>[] = [
  {
    id: 'user',
    header: '유저',
    size: 140,
    cell: ({ row }) => <UserCell username={row.original.username} userId={row.original.userId} />,
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
    id: 'status',
    header: '상태',
    size: 85,
    cell: ({ row }) => {
      const status = resolveStatus(row.original);
      return <Badge variant={status.dotVariant}>{status.label}</Badge>;
    },
  },
  {
    accessorKey: 'isProduction',
    header: '환경',
    size: 85,
    cell: ({ row }) => <EnvironmentBadge isProduction={row.original.isProduction} />,
  },
  {
    accessorKey: 'createdAt',
    header: '구매 시간',
    size: 130,
    cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
  },
  {
    accessorKey: 'completedAt',
    header: '완료 시간',
    size: 130,
    cell: ({ row }) => <DateTimeCell value={row.original.completedAt} />,
  },
];

function PurchaseMetaList({
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
  const { items, isLoading, totalPage } = usePurchases({
    page,
    search: filters.search,
    startDate: filters.startDate,
    endDate: filters.endDate,
    platform: filters.platform,
    status: filters.purchaseStatus,
    isProduction: filters.isProduction,
    isSubscribe: filters.isSubscribe,
  });

  return (
    <DataTable
      columns={columns}
      data={items}
      loading={isLoading}
      onRow={(record) => ({ onClick: () => onOpenDetail({ type: 'purchase', purchaseId: record.id }) })}
      pagination={{
        total: totalPage * 20,
        page,
        pageSize: 20,
        onChange: onPageChange,
      }}
    />
  );
}

export default PurchaseMetaList;
