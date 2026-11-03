import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import FeatureFlagsManager from '@/components/page/feature-flags/FeatureFlagsManager';

function FeatureFlagsPage() {
  return (
    <div>
      <FeatureFlagsManager />
    </div>
  );
}

FeatureFlagsPage.getLayout = getDefaultLayout;
FeatureFlagsPage.pageHeader = pageHeader;

export default FeatureFlagsPage;
