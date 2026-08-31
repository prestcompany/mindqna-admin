import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import AppVersionManager from '@/components/page/app-version/AppVersionManager';

function AppVersionPage() {
  return (
    <div>
      <AppVersionManager />
    </div>
  );
}

AppVersionPage.getLayout = getDefaultLayout;
AppVersionPage.pageHeader = pageHeader;

export default AppVersionPage;
