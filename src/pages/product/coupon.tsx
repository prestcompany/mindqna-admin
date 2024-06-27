import { getDefaultLayout } from "@/components/layout/default-layout";
import pageHeader from "@/components/layout/page-header";
import CouponList from "@/components/page/coupon/CouponList";

function CouponPage() {
  return (
    <div>
      <CouponList />
    </div>
  );
}

CouponPage.getLayout = getDefaultLayout;
CouponPage.pageHeader = pageHeader;

export default CouponPage;
