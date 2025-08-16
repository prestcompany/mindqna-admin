import { useState } from 'react';

export interface UserFilterState {
  locale?: string[];
}

export interface UseUserFiltersReturn {
  filter: UserFilterState;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  updateFilter: (key: string, value: any) => void;
  resetFilters: () => void;
}

export function useUserFilters(): UseUserFiltersReturn {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<UserFilterState>({});

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
