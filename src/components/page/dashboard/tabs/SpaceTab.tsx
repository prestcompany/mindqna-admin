import 'chart.js/auto';
import 'chartjs-plugin-datalabels';
import dayjs from 'dayjs';

import StatCard from '@/components/ui/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutIcon } from '@/components/ui/icons';
import { useSpaceAnalytics } from '@/hooks/useAnalytics';
import useChartData from '@/hooks/useChartData';
import SpaceChart from '../charts/SpaceChart';
import SpaceTypeChart from '../charts/SpaceTypeChart';

interface SpaceTabProps {
  startedAt: dayjs.Dayjs;
  endedAt: dayjs.Dayjs;
}

function SpaceTab({ startedAt, endedAt }: SpaceTabProps) {
  const { data, isLoading, refetch } = useSpaceAnalytics({
    startedAt: startedAt.format('YYYY-MM-DD'),
    endedAt: endedAt.format('YYYY-MM-DD'),
  });

  console.log('data', data);

  // 차트 데이터 처리 로직을 커스텀 훅으로 분리
  const chartData = useChartData({ spaces: data?.spaces });
  const totalSpaceCount = data?.total.spaces ?? 0;
  const totalDeletedSpaceCount = data?.total.removedSpaces ?? 0;
  return (
    <>
      {/* 통계 카드 */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-2'>
        <StatCard
          title='총 공간 수'
          value={totalSpaceCount.toLocaleString()}
          icon={<LayoutIcon className='w-4 h-4 text-muted-foreground' />}
        />

        <StatCard
          title='총 삭제 공간 수'
          value={totalDeletedSpaceCount.toLocaleString()}
          icon={<LayoutIcon className='w-4 h-4 text-muted-foreground' />}
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
