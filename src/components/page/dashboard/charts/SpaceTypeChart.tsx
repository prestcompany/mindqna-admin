import { Chart } from 'react-chartjs-2';
import { SpaceTypeChartProps } from '../types';

function SpaceTypeChart({ spaceTypeCountMap, colors }: SpaceTypeChartProps) {
  return (
    <div className='flex gap-12'>
      <div className='w-[400px] h-[400px]'>
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
                backgroundColor: colors,
              },
            ],
          }}
        />
      </div>
      <div className='flex flex-col gap-4'>
        {Object.entries(spaceTypeCountMap).map(([type, count], index) => {
          return (
            <div key={type} className='flex items-center gap-2'>
              <div className='w-4 h-4 rounded-full' style={{ backgroundColor: colors[index] }}></div>
              {type} : {count}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SpaceTypeChart;
