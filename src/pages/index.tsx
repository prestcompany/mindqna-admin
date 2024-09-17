import { IDefaultLayoutPage, IPageHeader, getDefaultLayout } from '@/components/layout/default-layout';
import { useAuth } from '@/lib/auth/auth-provider';
import { Divider } from 'antd';

const pageHeader: IPageHeader = {
  title: 'Welcome',
};

const IndexPage: IDefaultLayoutPage = () => {
  const { session } = useAuth();

  return (
    <>
      <h2 className='title'>👋 {session.user.name || '관리자'}님 안녕하세요!</h2>
      <Divider />
    </>
  );
};

IndexPage.getLayout = getDefaultLayout;
IndexPage.pageHeader = pageHeader;

export default IndexPage;
