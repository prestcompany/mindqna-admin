import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GrowthComboChart from '../charts/growth-combo-chart';
import LocaleShareChart from '../charts/locale-share-chart';
import DashboardMetricCard from '../sections/dashboard-metric-card';
import LocaleGrowthTable from '../tables/locale-growth-table';
import { DashboardGrowthViewModel } from '../types/growth';
import LocaleDailyUserChart from '../charts/locale-daily-user-chart';

interface UserTabProps {
  dashboard: DashboardGrowthViewModel;
}

function UserTab({ dashboard }: UserTabProps) {
  const cumulativeBasisLabel = dashboard.granularity === 'day' ? '종료일 기준' : '월말';

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2'>
        <DashboardMetricCard metric={dashboard.kpis.users} />
        <DashboardMetricCard metric={dashboard.kpis.usersDelta} />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]'>
        <GrowthComboChart series={dashboard.userTrend} />
        <LocaleDailyUserChart series={dashboard.localeDailyUserTrend} />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]'>
        <Card className='border-slate-200/80 bg-white shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base text-slate-950'>선택 기간 가입자 성장</CardTitle>
            <CardDescription>날짜 필터가 적용되는 가입자 증가와 일평균만 분리해서 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocaleGrowthTable
              rows={dashboard.userLocaleRows}
              totalRow={dashboard.totalLocaleRow}
              includeTotalRow
              metric='users'
              view='period'
            />
          </CardContent>
        </Card>

        <LocaleShareChart
          rows={dashboard.userLocaleRows}
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

export default UserTab;
