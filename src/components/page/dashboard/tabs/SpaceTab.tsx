import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GrowthComboChart from '../charts/GrowthComboChart';
import LocaleShareChart from '../charts/LocaleShareChart';
import DashboardMetricCard from '../sections/DashboardMetricCard';
import LocaleGrowthTable from '../tables/LocaleGrowthTable';
import { DashboardGrowthViewModel } from '../types/growth';

interface SpaceTabProps {
  dashboard: DashboardGrowthViewModel;
}

function SpaceTab({ dashboard }: SpaceTabProps) {
  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2'>
        <DashboardMetricCard metric={dashboard.kpis.spaces} />
        <DashboardMetricCard metric={dashboard.kpis.spacesDelta} />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]'>
        <GrowthComboChart series={dashboard.spaceTrend} />

        <LocaleShareChart
          rows={dashboard.spaceLocaleRows}
          metric='spaces'
          title='공간 로케일 분포'
          description='현재 월말 누적 공간 규모를 가로 비교합니다.'
        />
      </div>

      <Card className='border-slate-200/80 bg-white shadow-sm'>
        <CardHeader>
          <CardTitle className='text-base text-slate-950'>공간 로케일 비교</CardTitle>
          <CardDescription>누적 공간과 선택 기간 순증을 평면 테이블로 비교합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <LocaleGrowthTable rows={dashboard.spaceLocaleRows} metric='spaces' />
        </CardContent>
      </Card>

      <Card className='border-slate-200/80 bg-white shadow-sm'>
        <CardHeader>
          <CardTitle className='text-base text-slate-950'>운영 포인트</CardTitle>
          <CardDescription>공간 증가가 두드러진 로케일을 빠르게 비교할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-3'>
          {dashboard.spaceLocaleRows.slice(0, 3).map((row) => (
            <div key={row.locale} className='rounded-2xl border border-slate-200 bg-sky-50/50 p-4'>
              <p className='text-sm font-medium text-slate-500'>{row.label}</p>
              <p className='mt-2 text-xl font-semibold tracking-tight text-slate-950'>
                {row.spaces.cumulative.toLocaleString('ko-KR')}
              </p>
              <p className='mt-1 text-sm text-sky-600'>
                {row.spaces.delta >= 0 ? '+' : ''}
                {row.spaces.delta.toLocaleString('ko-KR')}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default SpaceTab;
