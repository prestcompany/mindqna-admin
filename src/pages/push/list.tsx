import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import PushList from '@/components/page/push/PushList';

function PushPage() {
  return (
    <div>
      <PushList />
    </div>
  );
}

PushPage.getLayout = getDefaultLayout;
PushPage.pageHeader = pageHeader;

export default PushPage;
