import { Chart } from 'react-chartjs-2';
import { SpaceTypeChartProps } from '../types';

function SpaceTypeChart({ spaceTypeCountMap, colors }: SpaceTypeChartProps) {
  return (
    <div className='flex gap-12'>
      <div className='w-[600px] h-[600px]'>
        <Chart
          type='pie'
          options={{
            plugins: {
              datalabels: {
                display: true,
                color: 'white',
              },
            },
          }}
          data={{
            labels: Object.keys(spaceTypeCountMap),
            datasets: [
              {
                label: '공간 수',
                data: Object.values(spaceTypeCountMap),
              },
            ],
          }}
        />
      </div>
      <div className='flex flex-col gap-4'>
        {Object.entries(spaceTypeCountMap).map(([type, count]) => {
          return (
            <div key={type}>
              {type} : {count}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SpaceTypeChart;
