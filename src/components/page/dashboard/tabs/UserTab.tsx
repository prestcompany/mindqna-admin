import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import 'chart.js/auto';
import 'chartjs-plugin-datalabels';
import dayjs from 'dayjs';

import StatCard from '@/components/ui/StatCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UsersIcon } from '@/components/ui/icons';
import { useUsersAnalytics } from '@/hooks/useAnalytics';
import useChartData from '@/hooks/useChartData';
import UserChart from '../charts/UserChart';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface UserTabProps {
  startedAt: dayjs.Dayjs;
  endedAt: dayjs.Dayjs;
}

function UserTab({ startedAt, endedAt }: UserTabProps) {
  const { data, isLoading } = useUsersAnalytics({
    startedAt: startedAt.format('YYYY-MM-DD'),
    endedAt: endedAt.format('YYYY-MM-DD'),
  });

  // 차트 데이터 처리 로직을 커스텀 훅으로 분리
  const chartData = useChartData({ users: data?.users });
  const profiles = data?.profiles ?? [];
  const totalUserCount = data?.total.users ?? 0;
  const totalProfileCount = data?.total.profiles ?? 0;
  const totalUserRemovedCount = data?.total.removedProfiles ?? 0;

  // 최근 사용자 샘플 데이터

  return (
    <>
      {/* 통계 카드 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        <StatCard
          title='총 가입자'
          value={totalUserCount.toLocaleString()}
          icon={<UsersIcon className='w-4 h-4 text-muted-foreground' />}
          // change={{
          //   value: '+20.1%',
          //   isPositive: true,
          //   label: '지난 달 대비',
          // }}
        />

        <StatCard
          title='총 프로필'
          value={totalProfileCount.toLocaleString()}
          icon={<UsersIcon className='w-4 h-4 text-muted-foreground' />}
          // change={{
          //   value: '+180.1%',
          //   isPositive: true,
          //   label: '지난 달 대비',
          // }}
        />

        <StatCard
          title='총 탈퇴 프로필'
          value={totalUserRemovedCount.toLocaleString()}
          icon={<UsersIcon className='w-4 h-4 text-muted-foreground' />}
          // change={{
          //   value: '+19%',
          //   isPositive: true,
          //   label: '지난 달 대비',
          // }}
        />
      </div>

      <div className='grid grid-cols-1 gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>사용자 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <UserChart
              labels={chartData.labels || []}
              datasets={chartData.datasets || []}
              userCountMap={chartData.userCountMap || {}}
              dataMap={chartData.dataMap || {}}
              colors={chartData.colors}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 가입자</CardTitle>
            <CardDescription>현재 날짜에 {profiles.length}개의 프로필이 생성됐습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col gap-4 max-h-[300px] overflow-y-auto'>
              {profiles.map((profile, index) => (
                <div key={index} className='flex items-center gap-4 pb-2'>
                  <span className='text-sm text-muted-foreground'>{index + 1}</span>
                  <Avatar className='h-9 w-9'>
                    <AvatarImage src={profile.img?.uri} alt={profile.nickname} />
                    <AvatarFallback></AvatarFallback>
                  </Avatar>
                  <div className='space-y-1'>
                    <p className='text-sm font-medium leading-none'>{profile.nickname}</p>
                    <p className='text-sm text-muted-foreground'>{profile.nickname}</p>
                  </div>
                  <div className='ml-auto font-medium'>{profile.user?.locale}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default UserTab;
