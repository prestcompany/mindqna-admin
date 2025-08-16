import { User } from '@/client/types';
import { useState } from 'react';

export interface UseUserModalsReturn {
  // 상태
  isOpenSearch: boolean;
  isOpenTicket: boolean;
  isOpenMigration: boolean;
  focusedUser: User | undefined;
  focusedUsername: string;

  // 액션
  openSearch: () => void;
  closeSearch: () => void;
  openTicket: (user: User) => void;
  closeTicket: () => void;
  openMigration: () => void;
  closeMigration: () => void;
}

export function useUserModals(): UseUserModalsReturn {
  const [isOpenSearch, setOpenSearch] = useState(false);
  const [isOpenTicket, setOpenTicket] = useState(false);
  const [isOpenMigration, setOpenMigration] = useState(false);
  const [focusedUser, setFocusedUser] = useState<User | undefined>(undefined);
  const [focusedUsername, setFocusedUsername] = useState('');

  const openSearch = () => setOpenSearch(true);
  const closeSearch = () => setOpenSearch(false);

  const openTicket = (user: User) => {
    setFocusedUser(user);
    setFocusedUsername(user.username);
    setOpenTicket(true);
  };

  const closeTicket = () => {
    setOpenTicket(false);
    setFocusedUser(undefined);
    setFocusedUsername('');
  };

  const openMigration = () => setOpenMigration(true);
  const closeMigration = () => setOpenMigration(false);

  return {
    isOpenSearch,
    isOpenTicket,
    isOpenMigration,
    focusedUser,
    focusedUsername,
    openSearch,
    closeSearch,
    openTicket,
    closeTicket,
    openMigration,
    closeMigration,
  };
}
