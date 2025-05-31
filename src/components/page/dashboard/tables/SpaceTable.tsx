import { Collapse } from 'antd';
import { SpaceTableProps } from '../types';

export function SpaceTable({ labels, spaceCountMap, spaceDataMap, colors }: SpaceTableProps) {
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
  const daysCount = labels.length;
  const avgSpacesPerDay = daysCount > 0 ? Math.round(totalSpaces / daysCount) : 0;

  const allPanelKeys = Object.keys(spaceCountMap);

  const avgSpacesPerLocalePerDay: Record<string, number> = {};
  if (daysCount > 0) {
    Object.entries(totalCounts).forEach(([locale, count]) => {
      avgSpacesPerLocalePerDay[locale] = Math.round(count / daysCount);
    });
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center gap-4'>
        <div className='text-lg font-medium'>총 생성 공간 수: {totalSpaces}개</div>
        <div className='text-lg font-medium text-blue-600'>(일 평균: {avgSpacesPerDay}개)</div>
      </div>

      {/* 언어별 일 평균 사용자 수 섹션 */}
      <div className='flex gap-2'>
        <div className='mb-2 text-lg font-medium'>언어별 일 평균 생성 공간 수:</div>
        <div className='flex flex-wrap gap-2'>
          {Object.entries(avgSpacesPerLocalePerDay).map(([locale, avgCount], idx) => {
            if (totalCounts[locale] === 0) return null; // 총 사용자 수가 0이면 평균도 표시하지 않음
            return (
              <div
                key={`${locale}-avg`}
                className='px-3 py-1 font-bold rounded'
                style={{ backgroundColor: colors[idx % colors.length], color: '#000000' }}
              >
                {locale}: {avgCount}개
              </div>
            );
          })}
        </div>
      </div>

      <div className='flex flex-wrap gap-2'>
        <div className='mb-2 text-lg font-medium'>언어별 총 생성 공간 수:</div>
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
        <div className='max-h-[800px] overflow-y-auto pr-2'>
          <Collapse activeKey={allPanelKeys}>
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
  );
}
