import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import CustomList from '@/components/page/custom/CustomList';

function CustomPage() {
  return (
    <div>
      <CustomList />
    </div>
  );
}

CustomPage.getLayout = getDefaultLayout;
CustomPage.pageHeader = pageHeader;

export default CustomPage;
