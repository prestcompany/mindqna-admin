import { DashboardLocaleDailySeries } from '../types/growth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface LocaleDailyUserChartProps {
  series: DashboardLocaleDailySeries;
}

function LocaleDailyUserChart({ series }: LocaleDailyUserChartProps) {
  if (!series.labels.length || !series.datasets.length) {
    return (
      <Card className='border-slate-200/80 bg-white shadow-sm'>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-base text-slate-950'>{series.title}</CardTitle>
          <CardDescription>{series.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500'>
            표시할 가입자 증가 데이터가 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const data: ChartData<'bar', number[], string> = {
    labels: series.labels,
    datasets: series.datasets.map((dataset) => ({
      label: dataset.label,
      data: dataset.values,
      backgroundColor: `${dataset.color}cc`,
      borderColor: dataset.color,
      borderWidth: 1,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness: 28,
    })),
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          color: '#334155',
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${Number(context.raw || 0).toLocaleString('ko-KR')}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
        },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
        ticks: {
          color: '#64748b',
          callback: (value) => Number(value).toLocaleString('ko-KR'),
        },
      },
    },
  };

  return (
    <Card className='border-slate-200/80 bg-white shadow-sm'>
      <CardHeader className='space-y-2'>
        <CardTitle className='text-base text-slate-950'>{series.title}</CardTitle>
        <CardDescription>{series.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='h-[320px]'>
          <Bar data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

export default LocaleDailyUserChart;
