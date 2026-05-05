import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GrowthComboChart from '../charts/GrowthComboChart';
import DashboardMetricCard from '../sections/DashboardMetricCard';
import LocaleShareChart from '../charts/LocaleShareChart';
import LocaleGrowthTable from '../tables/LocaleGrowthTable';
import { DashboardGrowthViewModel } from '../types/growth';
import LocaleDailyUserChart from '../charts/LocaleDailyUserChart';

interface OverviewTabProps {
  dashboard: DashboardGrowthViewModel;
}

function OverviewTab({ dashboard }: OverviewTabProps) {
  const cumulativeBasisLabel = dashboard.granularity === 'day' ? '종료일 기준' : '월말';

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <DashboardMetricCard metric={dashboard.kpis.users} />
        <DashboardMetricCard metric={dashboard.kpis.usersDelta} />
        <DashboardMetricCard metric={dashboard.kpis.spaces} />
        <DashboardMetricCard metric={dashboard.kpis.spacesDelta} />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]'>
        <GrowthComboChart series={dashboard.overviewTrend} />
        <LocaleDailyUserChart series={dashboard.localeDailyUserTrend} />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]'>
        <Card className='border-slate-200/80 bg-white shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base text-slate-950'>선택 기간 로케일 성장</CardTitle>
            <CardDescription>날짜 필터가 적용되는 가입자/공간 증가만 분리해서 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocaleGrowthTable
              rows={dashboard.localeLeaderboard}
              totalRow={dashboard.totalLocaleRow}
              includeTotalRow
              metric='overview'
              view='period'
            />
          </CardContent>
        </Card>
        <LocaleShareChart
          rows={dashboard.localeLeaderboard}
          metric='users'
          mode='cumulative'
          variant='doughnut'
          title='종료일 기준 누적 가입자 분포'
          description={`현재 ${cumulativeBasisLabel} 누적 가입자 규모를 비중 중심으로 비교합니다.`}
        />
      </div>
    </div>
  );
}

export default OverviewTab;
