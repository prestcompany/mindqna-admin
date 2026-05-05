import DataTable from '@/components/shared/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { DashboardLocaleRow } from '../types/growth';
import { ColumnDef } from '@tanstack/react-table';

interface LocaleGrowthTableProps {
  rows: DashboardLocaleRow[];
  totalRow?: DashboardLocaleRow;
  includeTotalRow?: boolean;
  metric: 'users' | 'spaces' | 'overview';
  view?: 'period' | 'mixed';
}

function formatDelta(delta: number) {
  return `${delta >= 0 ? '+' : ''}${delta.toLocaleString('ko-KR')}`;
}

function formatAverage(value: number) {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
  });
}

function LocaleGrowthTable({
  rows,
  totalRow,
  includeTotalRow = false,
  metric,
  view = 'mixed',
}: LocaleGrowthTableProps) {
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
      header: view === 'period' ? '선택 기간 가입자 증가' : '가입자 증가',
      size: view === 'period' ? 190 : 140,
      cell: ({ row }) => formatDelta(row.original.users.delta),
    },
    {
      id: 'dailyAverageUsers',
      header: view === 'period' ? '가입자 일평균' : '일 평균 가입자',
      size: 160,
      cell: ({ row }) => formatAverage(row.original.dailyAverageUsers),
    },
    {
      id: 'usersCumulative',
      header: '종료일 기준 누적 가입자',
      size: 150,
      cell: ({ row }) => row.original.users.cumulative.toLocaleString('ko-KR'),
    },
    {
      id: 'spacesDelta',
      header: view === 'period' ? '선택 기간 공간 증가' : '공간 증가',
      size: view === 'period' ? 180 : 140,
      cell: ({ row }) => formatDelta(row.original.spaces.delta),
    },
    {
      id: 'dailyAverageSpaces',
      header: view === 'period' ? '공간 일평균' : '일 평균 공간',
      size: 150,
      cell: ({ row }) => formatAverage(row.original.dailyAverageSpaces),
    },
    {
      id: 'spacesCumulative',
      header: '종료일 기준 누적 공간',
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
    view === 'period' && metric === 'overview'
      ? columns.filter((column) => !['usersCumulative', 'spacesCumulative', 'share'].includes(column.id ?? ''))
      : view === 'period' && metric === 'users'
        ? columns.filter(
            (column) =>
              !['usersCumulative', 'spacesDelta', 'dailyAverageSpaces', 'spacesCumulative', 'share'].includes(
                column.id ?? '',
              ),
          )
        : view === 'period' && metric === 'spaces'
          ? columns.filter(
              (column) =>
                !['usersDelta', 'dailyAverageUsers', 'usersCumulative', 'spacesCumulative', 'share'].includes(
                  column.id ?? '',
                ),
            )
          : metric === 'users'
            ? columns.filter(
                (column) => !['spacesDelta', 'dailyAverageSpaces', 'spacesCumulative'].includes(column.id ?? ''),
              )
            : metric === 'spaces'
              ? columns.filter(
                  (column) => !['usersDelta', 'dailyAverageUsers', 'usersCumulative'].includes(column.id ?? ''),
                )
              : columns;

  return <DataTable columns={visibleColumns} data={tableRows} rowKey={(row) => row.locale} />;
}

export default LocaleGrowthTable;
