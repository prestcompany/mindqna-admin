import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import BannerList from "@/components/page/banner/BannerList";

function BannerPage() {
  return (
    <div>
      <BannerList />
    </div>
  );
}

BannerPage.getLayout = getDefaultLayout;
BannerPage.pageHeader = pageHeader;

export default BannerPage;
