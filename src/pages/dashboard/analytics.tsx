import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import Dashboard from '@/components/page/dashboard/Dashboard';

function AnalyticsPage() {
  return (
    <div>
      <Dashboard />
    </div>
  );
}

AnalyticsPage.getLayout = getDefaultLayout;
AnalyticsPage.pageHeader = pageHeader;

export default AnalyticsPage;
