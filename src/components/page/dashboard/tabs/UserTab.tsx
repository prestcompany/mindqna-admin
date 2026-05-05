import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GrowthComboChart from '../charts/GrowthComboChart';
import LocaleShareChart from '../charts/LocaleShareChart';
import DashboardMetricCard from '../sections/DashboardMetricCard';
import LocaleGrowthTable from '../tables/LocaleGrowthTable';
import { DashboardGrowthViewModel } from '../types/growth';
import LocaleDailyUserChart from '../charts/LocaleDailyUserChart';

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
            <CardDescription>날짜 필터가 적용되는 가입자 순증과 일평균만 분리해서 비교합니다.</CardDescription>
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

      <Card className='border-slate-200/80 bg-white shadow-sm'>
        <CardHeader>
          <CardTitle className='text-base text-slate-950'>선택 기간 성장 상위 로케일</CardTitle>
          <CardDescription>날짜 필터 기준 가입자 순증이 큰 로케일을 빠르게 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-3'>
          {[...dashboard.userLocaleRows]
            .sort((left, right) => right.users.delta - left.users.delta)
            .slice(0, 3)
            .map((row) => (
              <div key={row.locale} className='rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
                <p className='text-sm font-medium text-slate-500'>{row.label}</p>
                <p className='mt-2 text-xl font-semibold tracking-tight text-slate-950'>
                  {row.users.delta >= 0 ? '+' : ''}
                  {row.users.delta.toLocaleString('ko-KR')}
                </p>
                <p className='mt-1 text-sm text-slate-500'>
                  종료일 누적 {row.users.cumulative.toLocaleString('ko-KR')}
                </p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserTab;
