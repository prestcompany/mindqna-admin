import { DashboardLocaleRow } from '../types/growth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarElement, CategoryScale, Chart as ChartJS, ChartData, ChartOptions, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface LocaleShareChartProps {
  rows: DashboardLocaleRow[];
  metric: 'users' | 'spaces';
  title?: string;
  description?: string;
}

const colors = ['#0f172a', '#0ea5e9', '#10b981', '#f59e0b', '#14b8a6', '#f97316', '#94a3b8'];

function LocaleShareChart({
  rows,
  metric,
  title = '로케일 분포',
  description = '현재 누적 규모 기준의 로케일 분포와 순위를 비교합니다.',
}: LocaleShareChartProps) {
  if (!rows.length) {
    return (
      <Card className='border-slate-200/80 bg-white shadow-sm'>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-base text-slate-950'>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500'>
            표시할 로케일 비중이 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricLabel = metric === 'users' ? '누적 가입자' : '누적 공간';
  const data: ChartData<'bar', number[], string> = {
    labels: rows.map((row) => row.label),
    datasets: [
      {
        label: metricLabel,
        data: rows.map((row) => (metric === 'users' ? row.users.cumulative : row.spaces.cumulative)),
        backgroundColor: rows.map((_, index) => colors[index % colors.length]),
        borderRadius: 999,
        borderSkipped: false,
        maxBarThickness: 20,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const row = rows[context.dataIndex];
            const share = metric === 'users' ? row.usersShare : row.spacesShare;
            return `${metricLabel}: ${Number(context.raw || 0).toLocaleString('ko-KR')} (${share.toFixed(1)}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
        ticks: {
          color: '#64748b',
          callback: (value) => Number(value).toLocaleString('ko-KR'),
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#334155',
        },
      },
    },
  };

  return (
    <Card className='border-slate-200/80 bg-white shadow-sm'>
      <CardHeader className='space-y-2'>
        <CardTitle className='text-base text-slate-950'>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='h-[320px]'>
          <Bar data={data} options={options} />
        </div>

        <div className='grid gap-2 sm:grid-cols-2'>
          {rows.map((row, index) => {
            const value = metric === 'users' ? row.users.cumulative : row.spaces.cumulative;
            const share = metric === 'users' ? row.usersShare : row.spacesShare;

            return (
              <div key={row.locale} className='flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2'>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: colors[index % colors.length] }} />
                  <span className='text-sm font-medium text-slate-800'>{row.label}</span>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-semibold text-slate-950'>{value.toLocaleString('ko-KR')}</p>
                  <p className='text-xs text-slate-500'>{share.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default LocaleShareChart;
