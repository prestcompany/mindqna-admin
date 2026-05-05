import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GrowthComboChart from '../charts/growth-combo-chart';
import LocaleShareChart from '../charts/locale-share-chart';
import DashboardMetricCard from '../sections/dashboard-metric-card';
import LocaleGrowthTable from '../tables/locale-growth-table';
import { DashboardGrowthViewModel } from '../types/growth';
import SpaceTypeDistributionCard from '../sections/space-type-distribution-card';

interface SpaceTabProps {
  dashboard: DashboardGrowthViewModel;
}

function SpaceTab({ dashboard }: SpaceTabProps) {
  const cumulativeBasisLabel = dashboard.granularity === 'day' ? '종료일 기준' : '월말';

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
          mode='delta'
          variant='doughnut'
          title='선택 기간 공간 증가 분포'
          description='선택 기간 동안 어느 로케일에서 공간이 더 많이 늘었는지 비교합니다.'
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]'>
        <Card className='border-slate-200/80 bg-white shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base text-slate-950'>선택 기간 공간 성장</CardTitle>
            <CardDescription>날짜 필터가 적용되는 공간 증가만 분리해서 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocaleGrowthTable
              rows={dashboard.spaceLocaleRows}
              totalRow={dashboard.totalLocaleRow}
              includeTotalRow
              metric='spaces'
              view='period'
            />
          </CardContent>
        </Card>

        <LocaleShareChart
          rows={dashboard.spaceLocaleRows}
          metric='spaces'
          mode='cumulative'
          variant='doughnut'
          title='종료일 기준 누적 공간 분포'
          description={`현재 ${cumulativeBasisLabel} 누적 공간 규모를 비중 중심으로 비교합니다.`}
        />
      </div>

      <SpaceTypeDistributionCard rows={dashboard.spaceTypeDistributions} />
    </div>
  );
}

export default SpaceTab;
