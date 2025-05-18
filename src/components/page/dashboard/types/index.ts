import { ChartOptions } from 'chart.js';

export interface CountMap {
  [key: string]: number;
}

export interface LocaleMap {
  [key: string]: Record<string, number>;
}

export type ChartProps = {
  labels: string[];
  datasets: any[];
  options?: ChartOptions;
  colors: string[];
};

export type UserChartProps = ChartProps & {
  userCountMap: CountMap;
  dataMap: LocaleMap;
};

export type SpaceChartProps = ChartProps & {
  spaceCountMap: CountMap;
  spaceDataMap: LocaleMap;
};

export type SpaceTypeChartProps = {
  spaceTypeCountMap: CountMap;
  colors: string[];
};

export type DateRangeProps = {
  startedAt: string;
  endedAt: string;
};
