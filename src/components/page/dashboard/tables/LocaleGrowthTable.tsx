import DataTable from '@/components/shared/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { DashboardLocaleRow } from '../types/growth';
import { ColumnDef } from '@tanstack/react-table';

interface LocaleGrowthTableProps {
  rows: DashboardLocaleRow[];
  metric: 'users' | 'spaces' | 'overview';
}

function LocaleGrowthTable({ rows, metric }: LocaleGrowthTableProps) {
  const columns: ColumnDef<DashboardLocaleRow>[] = [
    {
      accessorKey: 'rank',
      header: '순위',
      size: 72,
    },
    {
      accessorKey: 'label',
      header: '로케일',
      size: 160,
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <span className='font-medium text-slate-900'>{row.original.label}</span>
          <Badge variant='secondary'>{row.original.locale}</Badge>
        </div>
      ),
      meta: { useTruncateTooltip: false },
    },
    {
      id: 'usersCumulative',
      header: '누적 가입자',
      size: 150,
      cell: ({ row }) => row.original.users.cumulative.toLocaleString('ko-KR'),
    },
    {
      id: 'usersDelta',
      header: '가입자 순증',
      size: 140,
      cell: ({ row }) => `${row.original.users.delta >= 0 ? '+' : ''}${row.original.users.delta.toLocaleString('ko-KR')}`,
    },
    {
      id: 'spacesCumulative',
      header: '누적 공간',
      size: 150,
      cell: ({ row }) => row.original.spaces.cumulative.toLocaleString('ko-KR'),
    },
    {
      id: 'spacesDelta',
      header: '공간 순증',
      size: 140,
      cell: ({ row }) => `${row.original.spaces.delta >= 0 ? '+' : ''}${row.original.spaces.delta.toLocaleString('ko-KR')}`,
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

  return <DataTable columns={columns} data={rows} rowKey={(row) => row.locale} />;
}

export default LocaleGrowthTable;
