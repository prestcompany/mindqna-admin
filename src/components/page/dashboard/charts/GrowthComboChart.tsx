import { DashboardTrendSeries } from '../types/growth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarElement,
  BarController,
  CategoryScale,
  Chart as ChartJS,
  ChartData,
  ChartOptions,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Tooltip,
  Legend,
);

interface GrowthComboChartProps {
  series: DashboardTrendSeries;
}

function GrowthComboChart({ series }: GrowthComboChartProps) {
  if (!series.labels.length) {
    return (
      <Card className='border-slate-200/80 bg-white shadow-sm'>
        <CardHeader className='space-y-2'>
          <CardTitle className='text-base text-slate-950'>{series.title}</CardTitle>
          <CardDescription>{series.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500'>
            표시할 집계 데이터가 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const data: ChartData<'bar' | 'line', number[], string> = {
    labels: series.labels,
    datasets: series.datasets.map((dataset) => ({
      type: dataset.type,
      label: dataset.label,
      data: dataset.values,
      backgroundColor: dataset.type === 'bar' ? `${dataset.color}cc` : dataset.color,
      borderColor: dataset.color,
      borderWidth: dataset.type === 'line' ? 2.5 : 1,
      pointRadius: dataset.type === 'line' ? 2 : 0,
      pointHoverRadius: dataset.type === 'line' ? 4 : 0,
      tension: dataset.type === 'line' ? 0.3 : 0,
      yAxisID: dataset.yAxisID,
      maxBarThickness: 24,
      order: dataset.type === 'bar' ? 2 : 1,
    })),
  };

  const options: ChartOptions<'bar' | 'line'> = {
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
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
        },
      },
      y: {
        position: 'left',
        beginAtZero: true,
        grid: {
          color: 'rgba(148, 163, 184, 0.18)',
        },
        ticks: {
          color: '#64748b',
          callback: (value) => Number(value).toLocaleString('ko-KR'),
        },
      },
      y1: {
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
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
          <Chart type='bar' data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}

export default GrowthComboChart;
