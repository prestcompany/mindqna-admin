import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GrowthComboChart from '../charts/GrowthComboChart';
import LocaleShareChart from '../charts/LocaleShareChart';
import DashboardMetricCard from '../sections/DashboardMetricCard';
import LocaleGrowthTable from '../tables/LocaleGrowthTable';
import { DashboardGrowthViewModel } from '../types/growth';

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

        <LocaleShareChart
          rows={dashboard.userLocaleRows}
          metric='users'
          mode='delta'
          title='가입자 기간 순증 분포'
          description='선택 기간 동안 어느 로케일이 가입자 증가를 더 많이 만들었는지 비교합니다.'
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]'>
        <Card className='border-slate-200/80 bg-white shadow-sm'>
          <CardHeader>
            <CardTitle className='text-base text-slate-950'>가입자 로케일 비교</CardTitle>
            <CardDescription>{`${cumulativeBasisLabel} 누적 가입자와 선택 기간 순증을 평면 테이블로 비교합니다.`}</CardDescription>
          </CardHeader>
          <CardContent>
            <LocaleGrowthTable rows={dashboard.userLocaleRows} metric='users' />
          </CardContent>
        </Card>

        <LocaleShareChart
          rows={dashboard.userLocaleRows}
          metric='users'
          mode='cumulative'
          title='가입자 누적 분포'
          description={`현재 ${cumulativeBasisLabel} 누적 가입자 규모를 가로 비교합니다.`}
        />
      </div>

      <Card className='border-slate-200/80 bg-white shadow-sm'>
        <CardHeader>
          <CardTitle className='text-base text-slate-950'>운영 포인트</CardTitle>
          <CardDescription>가입자 증가가 두드러진 로케일을 빠르게 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-3'>
          {dashboard.userLocaleRows.slice(0, 3).map((row) => (
            <div key={row.locale} className='rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
              <p className='text-sm font-medium text-slate-500'>{row.label}</p>
              <p className='mt-2 text-xl font-semibold tracking-tight text-slate-950'>
                {row.users.cumulative.toLocaleString('ko-KR')}
              </p>
              <p className='mt-1 text-sm text-emerald-600'>
                {row.users.delta >= 0 ? '+' : ''}
                {row.users.delta.toLocaleString('ko-KR')}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserTab;
