import { useAuth } from '@/lib/auth/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import React, { useCallback } from 'react';

const Profile = () => {
  const { session } = useAuth();

  const handleLogoutClick = useCallback(async () => {
    signOut({ callbackUrl: '/login' });
  }, []);

  return (
    <>
      <div className='ml-2'>{session.user.name}</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className='flex items-center px-2 text-gray-600 rounded hover:bg-gray-200 enable-transition'>
            <span className='sm:max-w-[10rem] ellipsis-text'>{session.user.login}</span>
            <ChevronDown className='w-5 h-5' />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem onClick={handleLogoutClick}>
            <LogOut width={16} height={16} />
            로그아웃
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default React.memo(Profile);
