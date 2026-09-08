import { listStats, type StatsCondition, type StatsSpaceRow } from '@/client/stats';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
import { Sheet } from '@/components/ui/sheet';
import { useResetOnChange } from '@/hooks/useResetOnChange';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

const PAGE_SIZE = 50;

const columns: ColumnDef<StatsSpaceRow>[] = [
  { accessorKey: 'spaceId', header: '공간 ID', size: 140 },
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'type', header: '유형', size: 100 },
  { accessorKey: 'locale', header: '언어', size: 80 },
  { accessorKey: 'members', header: '멤버', size: 80 },
];

interface StatsDrilldownSheetProps {
  open: boolean;
  onClose: () => void;
  entity: string;
  filters: StatsCondition[];
  bucket: StatsCondition | null;
  label: string;
  total: number;
}

function StatsDrilldownSheet({ open, onClose, entity, filters, bucket, label, total }: StatsDrilldownSheetProps) {
  const [page, setPage] = useState(1);

  // A different bucket is a different result set, so it starts at page 1.
  useResetOnChange([label], () => setPage(1));

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stats-list', entity, filters, bucket, page],
    queryFn: () => listStats({ entity, filters, bucket: bucket as StatsCondition, page, size: PAGE_SIZE }),
    enabled: open && !!bucket,
  });

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <AdminSideSheetContent title={label} description={`${total.toLocaleString()}개`} size='lg'>
        {isError ? (
          // Without this the sheet shows an empty table under a non-zero count,
          // which reads as "this bucket is empty" rather than "the list failed".
          <p className='p-4 text-sm text-destructive'>목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        ) : (
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            loading={isLoading}
            rowKey='spaceId'
            pagination={{ total, page, pageSize: PAGE_SIZE, onChange: (next) => setPage(next) }}
          />
        )}
      </AdminSideSheetContent>
    </Sheet>
  );
}

export default StatsDrilldownSheet;
