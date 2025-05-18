import { Space, User } from '@/client/types';
import { countItemsWithSameKey, countSameCreatedAt } from '@/components/page/dashboard/utils/countFunctions';
import dayjs from 'dayjs';
import { useMemo } from 'react';

type DataItem = {
  createdAt: string;
  locale?: string;
  spaceInfo?: {
    locale: string;
    type?: string;
  };
  profiles?: {
    locale: string;
  }[];
};

export const useChartData = (data: { users?: User[]; spaces?: Space[] } | undefined) => {
  const colors = ['#bbf7d0', '#67e8f9', '#c4b5fd', '#fdba74', '#f472b6', '#f97316', '#8b5cf6'];
  const locales = ['ko', 'en', 'ja', 'zh', 'zhTw', 'es', 'id'];

  // 사용자 데이터 처리
  const userResults = useMemo(() => {
    const users = data?.users ?? [];
    const userCountMap = countSameCreatedAt(
      users.map((user) => ({
        createdAt: dayjs(user.createdAt).format('YYYY-MM-DD'),
      })),
    );

    const dataMap = users.reduce(
      (acc, user) => {
        const createdAt = dayjs(user.createdAt).format('YYYY-MM-DD');
        const locale = user.locale || 'ko';
        const defaultLocaleMap = { ko: 0, en: 0, ja: 0, zh: 0, zhTw: 0, es: 0, id: 0 };

        if (!acc[createdAt]) {
          acc[createdAt] = defaultLocaleMap;
        }

        if (!acc[createdAt][locale]) {
          acc[createdAt][locale] = 0;
        }

        acc[createdAt][locale] += 1;
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    const labels = Object.keys(dataMap).sort();

    const datasets = locales.map((locale, index) => {
      return {
        label: locale,
        data: labels.map((label) => dataMap[label][locale] || 0),
        backgroundColor: colors[index],
        stack: locale,
      };
    });

    return { labels, datasets, userCountMap, dataMap };
  }, [data?.users]);

  // 공간 데이터 처리
  const spaceResults = useMemo(() => {
    const spaces = data?.spaces ?? [];

    const spaceCountMap = countSameCreatedAt(
      spaces.map((item) => ({
        createdAt: dayjs(item.createdAt).format('YYYY-MM-DD'),
      })),
    );

    const spaceDataMap = spaces.reduce(
      (acc, space) => {
        const createdAt = dayjs(space.createdAt).format('YYYY-MM-DD');
        const locale = space.spaceInfo?.locale || 'ko';
        const defaultLocaleMap = { ko: 0, en: 0, ja: 0, zh: 0 };

        if (!acc[createdAt]) {
          acc[createdAt] = defaultLocaleMap;
        }

        if (!acc[createdAt][locale]) {
          acc[createdAt][locale] = 0;
        }

        acc[createdAt][locale] += 1;
        return acc;
      },
      {} as Record<string, Record<string, number>>,
    );

    const spaceLabels = Object.keys(spaceDataMap).sort();

    const spaceDatasets = locales.slice(0, 4).map((locale, index) => {
      return {
        label: locale,
        data: spaceLabels.map((label) => spaceDataMap[label][locale] || 0),
        backgroundColor: colors[index],
        stack: locale,
      };
    });

    const spaceTypeCountMap = countItemsWithSameKey(
      spaces.map((space) => ({
        type: space.spaceInfo?.type || 'unknown',
      })),
      'type',
    );

    return { spaceLabels, spaceDatasets, spaceCountMap, spaceDataMap, spaceTypeCountMap };
  }, [data?.spaces]);

  return {
    colors,
    locales,
    ...userResults,
    ...spaceResults,
  };
};

export default useChartData;
