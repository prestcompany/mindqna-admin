import DataTable from '@/components/shared/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { DashboardLocaleRow } from '../types/growth';
import { ColumnDef } from '@tanstack/react-table';

interface LocaleGrowthTableProps {
  rows: DashboardLocaleRow[];
  totalRow?: DashboardLocaleRow;
  includeTotalRow?: boolean;
  metric: 'users' | 'spaces' | 'overview';
}

function formatDelta(delta: number) {
  return `${delta >= 0 ? '+' : ''}${delta.toLocaleString('ko-KR')}`;
}

function formatAverage(value: number) {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
  });
}

function LocaleGrowthTable({ rows, totalRow, includeTotalRow = false, metric }: LocaleGrowthTableProps) {
  const tableRows = includeTotalRow && totalRow ? [totalRow, ...rows] : rows;
  const columns: ColumnDef<DashboardLocaleRow>[] = [
    {
      accessorKey: 'rank',
      header: '순위',
      size: 72,
      cell: ({ row }) => (row.original.isTotal ? '-' : row.original.rank),
    },
    {
      accessorKey: 'label',
      header: '로케일',
      size: 160,
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <span className='font-medium text-slate-900'>{row.original.label}</span>
          <Badge variant='secondary'>{row.original.isTotal ? '합산' : row.original.locale}</Badge>
        </div>
      ),
      meta: { useTruncateTooltip: false },
    },
    {
      id: 'usersDelta',
      header: '가입자 순증',
      size: 140,
      cell: ({ row }) => formatDelta(row.original.users.delta),
    },
    {
      id: 'dailyAverageUsers',
      header: '일 평균 가입자',
      size: 150,
      cell: ({ row }) => formatAverage(row.original.dailyAverageUsers),
    },
    {
      id: 'usersCumulative',
      header: '누적 가입자',
      size: 150,
      cell: ({ row }) => row.original.users.cumulative.toLocaleString('ko-KR'),
    },
    {
      id: 'spacesDelta',
      header: '공간 순증',
      size: 140,
      cell: ({ row }) => formatDelta(row.original.spaces.delta),
    },
    {
      id: 'spacesCumulative',
      header: '누적 공간',
      size: 150,
      cell: ({ row }) => row.original.spaces.cumulative.toLocaleString('ko-KR'),
    },
    {
      id: 'share',
      header: metric === 'spaces' ? '공간 비중' : metric === 'users' ? '가입자 비중' : '주요 비중',
      size: 120,
      cell: ({ row }) => {
        const share =
          metric === 'spaces'
            ? row.original.spacesShare
            : metric === 'users'
              ? row.original.usersShare
              : Math.max(row.original.usersShare, row.original.spacesShare);

        return `${share.toFixed(1)}%`;
      },
    },
  ];
  const visibleColumns =
    metric === 'users'
      ? columns.filter((column) => !['spacesDelta', 'spacesCumulative'].includes(column.id ?? ''))
      : metric === 'spaces'
        ? columns.filter((column) => !['usersDelta', 'dailyAverageUsers', 'usersCumulative'].includes(column.id ?? ''))
        : columns;

  return <DataTable columns={visibleColumns} data={tableRows} rowKey={(row) => row.locale} />;
}

export default LocaleGrowthTable;
