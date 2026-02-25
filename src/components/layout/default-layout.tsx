import { motion } from 'framer-motion';
import { NextComponentType, NextPage } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import Header from './header';
import MainMenu from './main-menu';
import MenuBtn from './menu-btn';
import PageHeader from './page-header';
import Sidebar from './sidebar';

export interface IPageHeader {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export type IDefaultLayoutPage<P = {}> = NextPage<P> & {
  getLayout(page: NextComponentType, props: unknown): React.ReactNode;
  pageHeader?: IPageHeader;
};

interface IDefaultLayoutProps {
  Page: IDefaultLayoutPage;
}

const DefaultLayout = ({ Page, ...props }: IDefaultLayoutProps) => {
  const [isShowSidebar, setIsShowSidebar] = useState(true);
  const [isShowPopupMenu, setIsShowPopupMenu] = useState(false);
  const router = useRouter();

  const showSidebar = useCallback(() => {
    setIsShowSidebar(true);
  }, []);

  const hideSidebar = useCallback(() => {
    setIsShowSidebar(false);
  }, []);

  const setActive = useCallback((val: boolean) => {
    if (val) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    setIsShowPopupMenu(val);
  }, []);

  useEffect(() => {
    setActive(false);
  }, [router.asPath, setActive]);

  return (
    <div className='min-h-screen'>
      <Sidebar isShowSidebar={isShowSidebar} hideSidebar={hideSidebar} />

      {/* mobile navigation */}
      <div className='z-40 flex items-center justify-between px-4 border-b border-border h-14 sm:hidden'>
        <div className='flex items-center gap-2.5'>
          <div className='flex items-center justify-center w-8 h-8 text-sm font-bold text-primary-foreground rounded-lg bg-primary'>
            M
          </div>
          <span className='text-sm font-semibold text-foreground'>mindBridge</span>
        </div>
        <div>
          <MenuBtn isActive={isShowPopupMenu} setActive={setActive} />
        </div>
      </div>
      <motion.div
        animate={isShowPopupMenu ? 'open' : 'closed'}
        initial={{ display: 'none' }}
        variants={{
          open: { display: 'block', opacity: 1, y: 0 },
          closed: { opacity: 0, y: '-10px', transitionEnd: { display: 'none' } },
        }}
        transition={{ duration: 0.15 }}
        className='fixed bottom-0 left-0 right-0 z-30 w-full p-4 overflow-auto bg-background border-t border-border'
        style={{ top: '3.5rem' }}
      >
        <MainMenu />
      </motion.div>

      <div className={`sm:h-full sm:overflow-auto transition-[margin] duration-200 ${isShowSidebar ? 'sm:ml-64' : ''}`}>
        <div className='hidden sm:block'>
          <Header isShowSidebar={isShowSidebar} showSidebar={showSidebar} />
        </div>
        {Page.pageHeader && <PageHeader value={Page.pageHeader} />}
        <section className='px-5 pb-5 sm:px-6'>
          <Page {...props} />
        </section>
      </div>
    </div>
  );
};

export const getDefaultLayout = (Page: IDefaultLayoutPage, props: Record<string, unknown>) => {
  return <DefaultLayout {...props} Page={Page} />;
};
