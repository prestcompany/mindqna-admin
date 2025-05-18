import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import 'chart.js/auto';
import 'chartjs-plugin-datalabels';
import dayjs from 'dayjs';
import { useEffect } from 'react';

import StatCard from '@/components/ui/StatCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityIcon, ChartIcon, CreditCardIcon, UsersIcon } from '@/components/ui/icons';
import useAnalytics from '@/hooks/useAnaytics';
import useChartData from '@/hooks/useChartData';
import UserChart from '../charts/UserChart';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface UserTabProps {
  startedAt: dayjs.Dayjs;
  endedAt: dayjs.Dayjs;
}

function UserTab({ startedAt, endedAt }: UserTabProps) {
  const { data, isLoading, refetch } = useAnalytics({
    startedAt: startedAt.format('YYYY-MM-DD'),
    endedAt: endedAt.format('YYYY-MM-DD'),
  });

  // 날짜 변경 시 데이터 다시 가져오기
  useEffect(() => {
    refetch();
  }, [startedAt, endedAt, refetch]);

  // 차트 데이터 처리 로직을 커스텀 훅으로 분리
  const chartData = useChartData({ users: data?.users });

  // 최근 사용자 샘플 데이터
  const recentUsers = [
    {
      name: '김민수',
      email: 'minsu.kim@example.com',
      amount: '+₩1,999,000',
      avatar: '/avatars/01.png',
    },
    {
      name: '이지현',
      email: 'jihyun.lee@example.com',
      amount: '+₩39,000',
      avatar: '/avatars/02.png',
    },
    {
      name: '박성민',
      email: 'sungmin.park@example.com',
      amount: '+₩299,000',
      avatar: '/avatars/03.png',
    },
    {
      name: '정윤아',
      email: 'yoona.jung@example.com',
      amount: '+₩99,000',
      avatar: '/avatars/04.png',
    },
    {
      name: '최진우',
      email: 'jinwoo.choi@example.com',
      amount: '+₩39,000',
      avatar: '/avatars/05.png',
    },
  ];

  return (
    <>
      {/* 통계 카드 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='총 수익'
          value='₩45,231,890'
          icon={<ChartIcon className='w-4 h-4 text-muted-foreground' />}
          change={{
            value: '+20.1%',
            isPositive: true,
            label: '지난 달 대비',
          }}
        />

        <StatCard
          title='구독'
          value='+2,350'
          icon={<UsersIcon className='w-4 h-4 text-muted-foreground' />}
          change={{
            value: '+180.1%',
            isPositive: true,
            label: '지난 달 대비',
          }}
        />

        <StatCard
          title='판매'
          value='+12,234'
          icon={<CreditCardIcon className='w-4 h-4 text-muted-foreground' />}
          change={{
            value: '+19%',
            isPositive: true,
            label: '지난 달 대비',
          }}
        />

        <StatCard
          title='활성 사용자'
          value='+573'
          icon={<ActivityIcon className='w-4 h-4 text-muted-foreground' />}
          change={{
            value: '+201',
            isPositive: true,
            label: '지난 시간 대비',
          }}
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
            <CardDescription>이번 달에 265명의 사용자가 가입했습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-8'>
              {recentUsers.map((user, index) => (
                <div key={index} className='flex items-center'>
                  <Avatar className='h-9 w-9'>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className='ml-4 space-y-1'>
                    <p className='text-sm font-medium leading-none'>{user.name}</p>
                    <p className='text-sm text-muted-foreground'>{user.email}</p>
                  </div>
                  <div className='ml-auto font-medium'>{user.amount}</div>
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
