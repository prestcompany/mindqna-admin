import { Space } from '@/client/types';
import { useState } from 'react';

export interface UseSpaceModalsReturn {
  // 상태
  isOpenSearch: boolean;
  isOpenCoin: boolean;
  focused: Space | undefined;

  // 액션
  openSearch: () => void;
  closeSearch: () => void;
  openCoin: (space: Space) => void;
  closeCoin: () => void;
}

export function useSpaceModals(): UseSpaceModalsReturn {
  const [isOpenSearch, setOpenSearch] = useState(false);
  const [isOpenCoin, setOpenCoin] = useState(false);
  const [focused, setFocused] = useState<Space | undefined>(undefined);

  const openSearch = () => setOpenSearch(true);
  const closeSearch = () => setOpenSearch(false);

  const openCoin = (space: Space) => {
    setFocused(space);
    setOpenCoin(true);
  };

  const closeCoin = () => {
    setOpenCoin(false);
    setFocused(undefined);
  };

  return {
    isOpenSearch,
    isOpenCoin,
    focused,
    openSearch,
    closeSearch,
    openCoin,
    closeCoin,
  };
}
