import { SpaceType } from '@/client/types';
import { useState } from 'react';

export interface FilterState {
  type?: SpaceType[];
  locale?: string[];
  orderBy?: string;
}

export interface UseSpaceFiltersReturn {
  filter: FilterState;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  updateFilter: (key: string, value: any) => void;
  resetFilters: () => void;
}

export function useSpaceFilters(): UseSpaceFiltersReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterState>({});

  const updateFilter = (key: string, value: any) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value,
    }));
    setCurrentPage(1); // 필터 변경 시 첫 페이지로
  };

  const resetFilters = () => {
    setFilter({});
    setCurrentPage(1);
  };

  return {
    filter,
    currentPage,
    setCurrentPage,
    updateFilter,
    resetFilters,
  };
}
