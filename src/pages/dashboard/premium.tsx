import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import TicketMetaList from "@/components/page/premium/TicketMetaList";

function PremiumPage() {
  return (
    <div>
      <TicketMetaList />
    </div>
  );
}

PremiumPage.getLayout = getDefaultLayout;
PremiumPage.pageHeader = pageHeader;

export default PremiumPage;
