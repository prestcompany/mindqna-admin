import { motion } from 'framer-motion';
import { NextComponentType, NextPage } from 'next';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import Header from './header';
import MainMenu from './main-menu';
import MenuBtn from './menu-btn';
import PageHeader from './page-header';
import { resolveRouteHeader } from './route-labels';
import Sidebar from './sidebar';

export interface IPageHeader {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export type IDefaultLayoutPage<P = {}> = NextPage<P> & {
  getLayout(page: NextComponentType, props: unknown): React.ReactNode;
  pageHeader?: unknown;
};

interface IDefaultLayoutProps {
  Page: IDefaultLayoutPage;
}

const isPageHeaderValue = (value: unknown): value is IPageHeader => {
  return typeof value === 'object' && value !== null && typeof (value as IPageHeader).title === 'string';
};

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

  const resolvedPageHeader = isPageHeaderValue(Page.pageHeader)
    ? Page.pageHeader
    : resolveRouteHeader(router.pathname);

  return (
    <div className='min-h-screen bg-background'>
      <Sidebar isShowSidebar={isShowSidebar} hideSidebar={hideSidebar} />

      {/* mobile navigation */}
      <div className='border-b border-border/70 bg-background/95 backdrop-blur sm:hidden'>
        <div className='z-40 flex h-14 items-center justify-between px-4'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm'>
              M
            </div>
            <span className='text-sm font-semibold text-foreground'>mindBridge</span>
          </div>
          <div>
            <MenuBtn isActive={isShowPopupMenu} setActive={setActive} />
          </div>
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
        className='fixed inset-x-0 z-30 border-b border-border/70 bg-background/95 p-4 shadow-lg backdrop-blur sm:hidden'
        style={{ top: '3.5rem', maxHeight: 'calc(100vh - 3.5rem)' }}
      >
        <MainMenu />
      </motion.div>

      <div className={`min-h-screen transition-[margin] duration-200 ${isShowSidebar ? 'sm:ml-72' : ''}`}>
        <div className='hidden sm:block'>
          <Header isShowSidebar={isShowSidebar} showSidebar={showSidebar} />
        </div>
        {resolvedPageHeader && <PageHeader value={resolvedPageHeader} />}
        <section className='px-4 pb-8 pt-5 sm:px-8'>
          <div className='mx-auto w-full max-w-[1600px]'>
            <Page {...props} />
          </div>
        </section>
      </div>
    </div>
  );
};

export const getDefaultLayout = (Page: IDefaultLayoutPage, props: Record<string, unknown>) => {
  return <DefaultLayout {...props} Page={Page} />;
};
