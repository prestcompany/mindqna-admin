import React from 'react';

interface CountMap {
  [key: string]: number;
}

interface DataMap {
  [key: string]: Record<string, number>;
}

interface ChartSummaryProps {
  countMap: CountMap;
  dataMap?: DataMap;
  colors?: string[];
  title?: string;
  className?: string;
}

const ChartSummary: React.FC<ChartSummaryProps> = ({ countMap, dataMap = {}, colors = [], title, className = '' }) => {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {title && <h3 className='text-sm font-medium text-muted-foreground'>{title}</h3>}

      {Object.entries(countMap).map(([type, count]) => {
        return (
          <div key={type} className='pb-2 border-b last:border-0 last:pb-0'>
            <div className='text-sm font-medium'>{type}</div>
            <div className='flex flex-wrap items-center gap-2 mt-1'>
              <div className='text-sm'>총계: {count}</div>

              {dataMap[type] &&
                Object.entries(dataMap[type] || {}).map(([locale, count], idx) => {
                  if (count === 0) return null;

                  return (
                    <div
                      key={locale}
                      className='px-2 py-1 text-xs rounded'
                      style={{
                        backgroundColor: colors[idx] ? `${colors[idx]}40` : '#eee',
                        color: colors[idx] ? `${colors[idx].replace('40', 'D0')}` : '#333',
                      }}
                    >
                      {locale}: {count}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChartSummary;
