import { Banner, BannerStatsDay } from '@/client/banner';
import DataTable from '@/components/shared/ui/data-table';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import useBannerStats from '@/hooks/useBannerStats';
import { ColumnDef } from '@tanstack/react-table';
import {
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import dayjs from 'dayjs';
import { Info } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { errorMessage } from '../coupon/errorMessage';
import {
  defaultStatsRange,
  formatCtr,
  formatKstDateTime,
  StatsRange,
  statsRangeError,
  viewsClicksNotice,
} from './services/banner-period';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// Chart series colors from the token layer (globals.css --link / --violet); DESIGN.md keeps
// the chromatic family for charts.
const VIEWS_COLOR = '#0070f3';
const CLICKS_COLOR = '#7928ca';

const formatCount = (value: number) => value.toLocaleString('ko-KR');

const columns: ColumnDef<BannerStatsDay>[] = [
  {
    accessorKey: 'date',
    header: '날짜',
    size: 120,
    cell: ({ row }) => <span className='tabular-nums'>{row.original.date.replace(/-/g, '.')}</span>,
  },
  {
    accessorKey: 'views',
    header: '노출',
    size: 96,
    cell: ({ row }) => <div className='text-right tabular-nums'>{formatCount(row.original.views)}</div>,
  },
  {
    accessorKey: 'clicks',
    header: '클릭',
    size: 96,
    cell: ({ row }) => <div className='text-right tabular-nums'>{formatCount(row.original.clicks)}</div>,
  },
  {
    accessorKey: 'ctr',
    header: '클릭률',
    size: 96,
    cell: ({ row }) => <div className='text-right tabular-nums'>{formatCtr(row.original.ctr)}</div>,
  },
  {
    accessorKey: 'claims',
    header: '보상 수령',
    size: 96,
    cell: ({ row }) => <div className='text-right tabular-nums'>{formatCount(row.original.claims)}</div>,
  },
];

function periodLabel(banner: Banner) {
  if (!banner.startAt && !banner.endAt) return '게시 기간 제한 없음';
  const start = banner.startAt ? formatKstDateTime(banner.startAt) : '제한 없음';
  const end = banner.endAt ? formatKstDateTime(banner.endAt) : '제한 없음';
  return `게시 기간 ${start} ~ ${end}`;
}

function BannerStatsSheet({ banner }: { banner: Banner }) {
  // Mounted with key={banner.id}, so each banner opens on its own period.
  const [range, setRange] = useState<StatsRange>(() => defaultStatsRange(banner, new Date()));

  const rangeError = statsRangeError(range);
  const { stats, isLoading, isError, error } = useBannerStats({
    id: banner.id,
    from: range.from,
    to: range.to,
    enabled: !rangeError,
  });

  // DatePickerWithRange speaks dayjs; the picked calendar day is the KST day as-is.
  const from = useMemo(() => dayjs(range.from), [range.from]);
  const to = useMemo(() => dayjs(range.to), [range.to]);
  const setFrom = (next: dayjs.Dayjs | null) =>
    next && setRange((prev) => ({ ...prev, from: next.format('YYYY-MM-DD') }));
  const setTo = (next: dayjs.Dayjs | null) => next && setRange((prev) => ({ ...prev, to: next.format('YYYY-MM-DD') }));

  const notice = stats ? viewsClicksNotice(range.from, stats.statsSince) : null;
  const days = stats?.days ?? [];

  const chartData: ChartData<'line', number[], string> = {
    labels: days.map((day) => day.date.slice(5).replace('-', '.')),
    datasets: [
      {
        label: '노출',
        data: days.map((day) => day.views),
        borderColor: VIEWS_COLOR,
        backgroundColor: VIEWS_COLOR,
        borderWidth: 2,
        pointRadius: days.length > 60 ? 0 : 2,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: '클릭',
        data: days.map((day) => day.clicks),
        borderColor: CLICKS_COLOR,
        backgroundColor: CLICKS_COLOR,
        borderWidth: 2,
        pointRadius: days.length > 60 ? 0 : 2,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  // Clicks are a small fraction of views, so each gets its own axis or the click line
  // flattens against zero.
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8, color: '#4d4d4d' },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${Number(context.raw || 0).toLocaleString('ko-KR')}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#737373', maxTicksLimit: 12 } },
      y: {
        position: 'left',
        beginAtZero: true,
        grid: { color: '#ebebeb' },
        ticks: { color: '#737373', precision: 0, callback: (value) => Number(value).toLocaleString('ko-KR') },
        title: { display: true, text: '노출', color: '#737373' },
      },
      y1: {
        position: 'right',
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: { color: '#737373', precision: 0, callback: (value) => Number(value).toLocaleString('ko-KR') },
        title: { display: true, text: '클릭', color: '#737373' },
      },
    },
  };

  const totals = stats?.totals;
  const tiles = [
    { label: '노출', value: totals ? formatCount(totals.views) : '-' },
    { label: '클릭', value: totals ? formatCount(totals.clicks) : '-' },
    { label: '클릭률', value: totals ? formatCtr(totals.ctr) : '-' },
    { label: '보상 수령', value: totals ? formatCount(totals.claims) : '-' },
  ];

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center gap-3'>
        <DatePickerWithRange startedAt={from} endedAt={to} setStartedAt={setFrom} setEndedAt={setTo} />
        <span className='text-sm text-muted-foreground'>{periodLabel(banner)}</span>
      </div>

      {rangeError ? <p className='text-sm text-destructive'>{rangeError}</p> : null}
      {isError ? <p className='text-sm text-destructive'>{errorMessage(error)}</p> : null}

      {notice ? (
        <div className='flex items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground'>
          <Info className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' aria-hidden />
          <span>{notice}</span>
        </div>
      ) : null}

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {tiles.map((tile) => (
          <div key={tile.label} className='rounded-lg border border-border bg-card px-4 py-3'>
            <div className='text-sm font-medium text-muted-foreground'>{tile.label}</div>
            <div className='mt-1 text-2xl font-semibold tracking-display tabular-nums text-foreground'>
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      <div className='rounded-lg border border-border bg-card p-4'>
        <div className='h-[260px]'>
          {days.length ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
              {isLoading ? '불러오는 중이에요.' : '표시할 데이터가 없어요.'}
            </div>
          )}
        </div>
      </div>

      <DataTable columns={columns} data={days} loading={isLoading} rowKey='date' />
    </div>
  );
}

export default BannerStatsSheet;
