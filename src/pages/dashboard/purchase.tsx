import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import PurchaseMetaList from "@/components/page/premium/PurchaseMetaList";

function PurchasePage() {
  return (
    <div>
      <PurchaseMetaList />
    </div>
  );
}

PurchasePage.getLayout = getDefaultLayout;
PurchasePage.pageHeader = pageHeader;

export default PurchasePage;
