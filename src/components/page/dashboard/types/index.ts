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

export type UserChartProps = Omit<ChartProps, 'colors'>;

export type UserTableProps = {
  labels: string[];
  userCountMap: CountMap;
  dataMap: LocaleMap;
  colors: string[];
};

export type SpaceChartProps = Omit<ChartProps, 'colors'>;

export type SpaceTableProps = {
  labels: string[];
  spaceCountMap: CountMap;
  spaceDataMap: LocaleMap;
  colors: string[];
};

export type SpaceTypeChartProps = {
  spaceTypeCountMap: CountMap;
  colors: string[];
};

export type DateRangeProps = {
  startedAt: string;
  endedAt: string;
};
