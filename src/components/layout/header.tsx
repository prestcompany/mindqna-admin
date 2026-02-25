import { useAuth } from '@/lib/auth/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, LogOut, PanelLeftOpen } from 'lucide-react';
import { signOut } from 'next-auth/react';
import React, { useCallback } from 'react';
import Breadcrumb from './breadcrumb';

interface IHeaderProps {
  isShowSidebar: boolean;
  showSidebar: () => void;
}

const Header = ({ isShowSidebar, showSidebar }: IHeaderProps) => {
  const { session } = useAuth();

  const handleLogoutClick = useCallback(async () => {
    signOut({ callbackUrl: '/login' });
  }, []);

  return (
    <header className='sticky top-0 z-20 flex items-center justify-between h-14 px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='flex gap-3 items-center'>
        {!isShowSidebar && (
          <button
            className='flex justify-center items-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            onClick={showSidebar}
          >
            <PanelLeftOpen className='w-4 h-4' />
          </button>
        )}
        <Breadcrumb />
      </div>
      <div className='flex gap-2 items-center'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className='flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'>
              <div className='flex justify-center items-center w-7 h-7 text-xs font-medium rounded-full bg-muted text-muted-foreground'>
                {session.user.name?.charAt(0) || 'U'}
              </div>
              <span className='hidden sm:inline max-w-[8rem] truncate'>{session.user.name || session.user.login}</span>
              <ChevronDown className='w-3.5 h-3.5' />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={handleLogoutClick}>
              <LogOut className='w-4 h-4 mr-2' />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default React.memo(Header);
