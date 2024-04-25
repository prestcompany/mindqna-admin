import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import BubbleList from "@/components/page/bubble/BubbleList";

function BubblePage() {
  return (
    <div>
      <BubbleList />
    </div>
  );
}

BubblePage.getLayout = getDefaultLayout;
BubblePage.pageHeader = pageHeader;

export default BubblePage;
