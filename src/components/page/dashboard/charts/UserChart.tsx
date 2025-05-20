import { Bar } from 'react-chartjs-2';
import { UserChartProps } from '../types';

function UserChart({ labels, datasets }: UserChartProps) {
  return (
    <div className='grid grid-cols-1 gap-6 '>
      {/* 차트 영역 */}
      <div className='w-full'>
        <Bar
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              datalabels: {
                display: true,
                color: 'white',
              },
            },
            scales: {
              y: { stacked: true },
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

export default UserChart;
