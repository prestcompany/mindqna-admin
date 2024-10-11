import { getDefaultLayout, IDefaultLayoutPage } from '@/components/layout/default-layout';
import PushForm from '@/components/page/push/PushForm';

const PushNewPage: IDefaultLayoutPage = () => {
  return <PushForm />;
};

PushNewPage.getLayout = getDefaultLayout;

export default PushNewPage;
