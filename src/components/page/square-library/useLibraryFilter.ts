import { LibrarySubType } from '@/client/square-library';
import { Locale } from '@/client/types';
import { useState } from 'react';

export interface LibraryFilter {
  subCategory?: LibrarySubType;
  locale?: Locale;
}

export const useLibraryFilter = () => {
  const [filter, setFilter] = useState<LibraryFilter>({});

  const updateFilter = (updates: Partial<LibraryFilter>) => {
    setFilter((prev) => ({ ...prev, ...updates }));
  };

  const clearFilter = () => {
    setFilter({});
  };

  return {
    filter,
    updateFilter,
    clearFilter,
  };
};
