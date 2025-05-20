import { ChartData, ChartOptions } from 'chart.js';
import React from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

export type ChartType = 'bar' | 'line' | 'doughnut';

interface SimpleChartProps {
  type: ChartType;
  data: ChartData<any, any>;
  options?: ChartOptions<any>;
  height?: number;
  width?: number;
  className?: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({
  type = 'bar',
  data,
  options = {},
  height,
  width,
  className = '',
}) => {
  const defaultOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: true,
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar data={data} options={mergedOptions} height={height} width={width} />;
      case 'line':
        return <Line data={data} options={mergedOptions} height={height} width={width} />;
      case 'doughnut':
        return <Doughnut data={data} options={mergedOptions} height={height} width={width} />;
      default:
        return <Bar data={data} options={mergedOptions} height={height} width={width} />;
    }
  };

  return (
    <div className={`w-full ${className}`} style={{ height: height || 300 }}>
      {renderChart()}
    </div>
  );
};

export default SimpleChart;
