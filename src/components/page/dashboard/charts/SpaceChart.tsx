import { Collapse } from 'antd';
import { Chart } from 'react-chartjs-2';
import { SpaceChartProps } from '../types';

function SpaceChart({ labels, datasets, spaceCountMap, spaceDataMap, colors }: SpaceChartProps) {
  // 전체 기간 데이터 집계
  const totalCounts: Record<string, number> = {};

  // 각 날짜별 locale 카운트를 합산
  Object.values(spaceDataMap).forEach((localeData) => {
    Object.entries(localeData).forEach(([locale, count]) => {
      if (!totalCounts[locale]) {
        totalCounts[locale] = 0;
      }
      totalCounts[locale] += count;
    });
  });

  // 전체 합계 계산
  const totalSpaces = Object.values(totalCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
      {/* 차트 영역 */}
      <div className='w-full'>
        <Chart
          type='bar'
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              datalabels: {
                display: true,
                color: 'white',
              },
            },
          }}
          data={{
            labels,
            datasets,
          }}
          height={300}
        />
      </div>

      {/* 전체 기간 통계 요약 */}
      <div className='flex flex-col gap-4'>
        <div className='text-2xl font-bold'>전체 기간 통계</div>
        <div className='text-lg font-medium'>총 생성 공간 수: {totalSpaces}</div>
        <div className='flex flex-wrap gap-2 mt-2'>
          {Object.entries(totalCounts).map(([locale, count], idx) => {
            if (count === 0) return null;
            return (
              <div key={locale} className='px-3 py-1 font-bold rounded' style={{ backgroundColor: colors[idx] }}>
                {locale} : {count}개
              </div>
            );
          })}
        </div>

        {/* 일자별 세부 데이터 collapse */}
        <div className='mt-4'>
          <div className='mb-2 text-xl font-bold'>일자별 세부 데이터</div>
          <div className='max-h-[300px] overflow-y-auto pr-2'>
            <Collapse>
              {Object.entries(spaceCountMap).map(([date, totalCount]) => (
                <Collapse.Panel header={`${date} (총 ${totalCount}개)`} key={date}>
                  <div className='flex flex-col gap-2'>
                    <div className='text-lg font-medium'>총 {totalCount} 개</div>
                    <div className='flex flex-wrap gap-2'>
                      {Object.entries(spaceDataMap[date] ?? {}).map(([locale, count], idx) => {
                        if (count === 0) return null;
                        return (
                          <div
                            key={locale}
                            className='px-2 py-1 font-bold rounded'
                            style={{ backgroundColor: colors[idx] }}
                          >
                            {locale}: {count}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Collapse.Panel>
              ))}
            </Collapse>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpaceChart;
