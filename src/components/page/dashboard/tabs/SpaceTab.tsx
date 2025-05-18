import 'chart.js/auto';
import 'chartjs-plugin-datalabels';
import dayjs from 'dayjs';
import { useEffect } from 'react';

import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityIcon, ChartIcon, CreditCardIcon, LayoutIcon } from '@/components/ui/icons';
import useAnalytics from '@/hooks/useAnaytics';
import useChartData from '@/hooks/useChartData';
import SpaceChart from '../charts/SpaceChart';
import SpaceTypeChart from '../charts/SpaceTypeChart';

interface SpaceTabProps {
  startedAt: dayjs.Dayjs;
  endedAt: dayjs.Dayjs;
}

function SpaceTab({ startedAt, endedAt }: SpaceTabProps) {
  const { data, isLoading, refetch } = useAnalytics({
    startedAt: startedAt.format('YYYY-MM-DD'),
    endedAt: endedAt.format('YYYY-MM-DD'),
  });

  // 날짜 변경 시 데이터 다시 가져오기
  useEffect(() => {
    refetch();
  }, [startedAt, endedAt, refetch]);

  // 차트 데이터 처리 로직을 커스텀 훅으로 분리
  const chartData = useChartData({ spaces: data?.spaces });

  // 공간 차트 데이터
  const spaceChartData = {
    labels: chartData.spaceLabels || [],
    datasets: chartData.spaceDatasets || [],
  };

  return (
    <>
      {/* 통계 카드 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          title='총 공간 수'
          value='3,845'
          icon={<LayoutIcon className='w-4 h-4 text-muted-foreground' />}
          change={{
            value: '+15.3%',
            isPositive: true,
            label: '지난 달 대비',
          }}
        />

        <StatCard
          title='활성 공간'
          value='1,284'
          icon={<ActivityIcon className='w-4 h-4 text-muted-foreground' />}
          change={{
            value: '+28.4%',
            isPositive: true,
            label: '지난 달 대비',
          }}
        />

        <StatCard
          title='공간 수익'
          value='₩28,415,000'
          icon={<ChartIcon className='w-4 h-4 text-muted-foreground' />}
          change={{
            value: '+12.7%',
            isPositive: true,
            label: '지난 달 대비',
          }}
        />

        <StatCard
          title='공간 결제'
          value='+567'
          icon={<CreditCardIcon className='w-4 h-4 text-muted-foreground' />}
          change={{
            value: '+23%',
            isPositive: true,
            label: '지난 달 대비',
          }}
        />
      </div>

      <div className='grid grid-cols-1 gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>공간 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <SpaceChart
              labels={chartData.spaceLabels || []}
              datasets={chartData.spaceDatasets || []}
              spaceCountMap={chartData.spaceCountMap || {}}
              spaceDataMap={chartData.spaceDataMap || {}}
              colors={chartData.colors}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>공간 타입 분석</CardTitle>
          </CardHeader>
          <CardContent>
            <SpaceTypeChart spaceTypeCountMap={chartData.spaceTypeCountMap || {}} colors={chartData.colors} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default SpaceTab;
