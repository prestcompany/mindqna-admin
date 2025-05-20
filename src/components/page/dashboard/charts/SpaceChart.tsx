import { Chart } from 'react-chartjs-2';
import { SpaceChartProps } from '../types';

function SpaceChart({ labels, datasets }: SpaceChartProps) {
  return (
    <div className='grid grid-cols-1 gap-6'>
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
    </div>
  );
}

export default SpaceChart;
