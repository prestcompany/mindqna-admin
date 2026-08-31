import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import PurchaseManagement from '@/components/page/premium/PurchaseManagement';

function PurchasePage() {
  return (
    <div>
      <PurchaseManagement />
    </div>
  );
}

PurchasePage.getLayout = getDefaultLayout;
PurchasePage.pageHeader = pageHeader;

export default PurchasePage;
