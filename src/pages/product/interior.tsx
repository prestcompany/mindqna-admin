import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import InteriorForm from "@/components/page/interior/InteriorForm";

function InteriorPage() {
  return (
    <div>
      <InteriorForm />
    </div>
  );
}

InteriorPage.getLayout = getDefaultLayout;
InteriorPage.pageHeader = pageHeader;

export default InteriorPage;
