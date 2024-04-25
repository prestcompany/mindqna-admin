import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";

function BubblePage() {
  return <div>BubblePage</div>;
}

BubblePage.getLayout = getDefaultLayout;
BubblePage.pageHeader = pageHeader;

export default BubblePage;
