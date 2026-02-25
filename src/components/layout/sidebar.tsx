import { ChevronsLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import MainMenu from './main-menu';

interface ISidebarProps {
  isShowSidebar: boolean;
  hideSidebar: () => void;
}

const Sidebar = ({ isShowSidebar, hideSidebar }: ISidebarProps) => {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border/70 bg-background/95 backdrop-blur ${
        isShowSidebar ? 'sm:flex' : 'sm:hidden'
      }`}
    >
      <div className='flex h-full flex-col'>
        <div className='border-b border-border/60 px-4 pb-3 pt-4'>
          <div className='flex items-center justify-between'>
            <Link href='/' className='flex items-center gap-3 group'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm'>
                M
              </div>
              <div className='leading-tight'>
                <div className='font-semibold text-foreground'>mindBridge</div>
                <div className='text-[11px] text-muted-foreground'>Admin Console</div>
              </div>
            </Link>
            <button
              className='flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
              onClick={hideSidebar}
              aria-label='사이드바 닫기'
              type='button'
            >
              <ChevronsLeft className='w-4 h-4' />
            </button>
          </div>
        </div>
        <div className='grow overflow-auto px-2 py-3'>
          <MainMenu />
        </div>
        <div className='border-t border-border/60 px-4 py-3 text-xs text-muted-foreground'>
          Workspace: mindBridge Admin
        </div>
      </div>
    </aside>
  );
};

export default React.memo(Sidebar);
