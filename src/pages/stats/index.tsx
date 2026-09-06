import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import StatsQueryPanel from '@/components/page/stats/StatsQueryPanel';

function StatsPage() {
  return (
    <div>
      <StatsQueryPanel />
    </div>
  );
}

StatsPage.getLayout = getDefaultLayout;
StatsPage.pageHeader = pageHeader;

export default StatsPage;
