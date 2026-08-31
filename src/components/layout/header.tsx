import { useAuth } from '@/lib/auth/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { openCommandPalette } from '@/components/shared/command-palette/CommandPalette';
import { ChevronDown, LogOut, PanelLeftOpen, Search } from 'lucide-react';
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
    <header className='sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl'>
      <div className='mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 sm:px-8'>
        <div className='flex min-w-0 items-center gap-3'>
          {!isShowSidebar && (
            <button
              className='flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
              onClick={showSidebar}
              aria-label='사이드바 열기'
              type='button'
            >
              <PanelLeftOpen className='w-4 h-4' />
            </button>
          )}
          <Breadcrumb />
        </div>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={openCommandPalette}
            aria-label='커맨드 팔레트 열기'
            className='hidden h-8 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm text-muted-foreground transition-colors duration-fast hover:bg-accent hover:text-accent-foreground sm:flex'
          >
            <Search className='h-3.5 w-3.5' />
            <span>검색 · 이동</span>
            <kbd className='ml-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground'>⌘K</kbd>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className='flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground transition-colors hover:bg-accent'
                aria-label='계정 메뉴 열기'
                type='button'
              >
                <div className='flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground'>
                  {session.user.name?.charAt(0) || 'U'}
                </div>
                <span className='hidden max-w-[9rem] truncate sm:inline'>{session.user.name || session.user.login}</span>
                <ChevronDown className='w-3.5 h-3.5 text-muted-foreground' />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={handleLogoutClick}>
                <LogOut className='mr-2 h-4 w-4' />
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
