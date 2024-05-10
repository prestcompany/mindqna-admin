import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";

function PremiumPage() {
  return <div>Analytics</div>;
}

PremiumPage.getLayout = getDefaultLayout;
PremiumPage.pageHeader = pageHeader;

export default PremiumPage;
