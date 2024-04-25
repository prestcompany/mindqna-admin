import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import LocaleList from "@/components/page/locale/LocaleList";

function LocalePage() {
  return (
    <div>
      <LocaleList />
    </div>
  );
}

LocalePage.getLayout = getDefaultLayout;
LocalePage.pageHeader = pageHeader;

export default LocalePage;
