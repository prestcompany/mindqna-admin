import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import SnackList from "@/components/page/snack/SnackList";

function SnackPage() {
  return (
    <div>
      <SnackList />
    </div>
  );
}

SnackPage.getLayout = getDefaultLayout;
SnackPage.pageHeader = pageHeader;

export default SnackPage;
