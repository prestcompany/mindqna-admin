import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import InteriorList from "@/components/page/interior/InteriorList";

function InteriorPage() {
  return (
    <div>
      <InteriorList />
    </div>
  );
}

InteriorPage.getLayout = getDefaultLayout;
InteriorPage.pageHeader = pageHeader;

export default InteriorPage;
