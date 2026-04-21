import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GrowthComboChart from '../charts/GrowthComboChart';
import DashboardMetricCard from '../sections/DashboardMetricCard';
import LocaleShareChart from '../charts/LocaleShareChart';
import LocaleGrowthTable from '../tables/LocaleGrowthTable';
import { DashboardGrowthViewModel } from '../types/growth';

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
        <LocaleShareChart
          rows={dashboard.localeLeaderboard}
          metric='users'
          title='가입자 로케일 분포'
          description={`현재 ${cumulativeBasisLabel} 누적 가입자 규모를 가로 비교합니다.`}
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]'>
        <Card className='border-slate-200/80 bg-white shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base text-slate-950'>로케일 리더보드</CardTitle>
            <CardDescription>선택 기간의 누적 규모와 순증을 한 번에 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocaleGrowthTable rows={dashboard.localeLeaderboard} metric='overview' />
          </CardContent>
        </Card>

        <div className='grid gap-4'>
          {dashboard.overviewInsights.map((insight) => (
            <Card key={insight.title} className='border-slate-200/80 bg-white shadow-sm'>
              <CardHeader className='space-y-2'>
                <CardTitle className='text-base text-slate-950'>{insight.title}</CardTitle>
                <CardDescription>{insight.description}</CardDescription>
              </CardHeader>
              <CardContent className='pt-0'>
                <p className='text-lg font-semibold tracking-tight text-slate-950'>{insight.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
