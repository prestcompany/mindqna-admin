import { ChevronsLeft } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import style from './default-layout.module.css';
import MainMenu from './main-menu';

interface ISidebarProps {
  isShowSidebar: boolean;
  hideSidebar: () => void;
}

const Sidebar = ({ isShowSidebar, hideSidebar }: ISidebarProps) => {
  return (
    <aside className={`hidden ${style.sidebar} ${isShowSidebar ? 'sm:block' : 'hidden'}`}>
      <div className='flex flex-col h-full'>
        <div className='flex justify-between items-center px-2 mb-2'>
          <Link href='/' className='flex items-center gap-2.5 group'>
            <div className='flex justify-center items-center w-8 h-8 text-sm font-bold rounded-lg text-primary-foreground bg-primary'>
              M
            </div>
            <span className='font-semibold text-foreground'>mindBridge</span>
          </Link>
          <button
            className='flex justify-center items-center w-8 h-8 rounded-md transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            onClick={hideSidebar}
          >
            <ChevronsLeft className='w-4 h-4' />
          </button>
        </div>
        <div className='overflow-auto px-1 grow'>
          <MainMenu />
        </div>
      </div>
    </aside>
  );
};

export default React.memo(Sidebar);
