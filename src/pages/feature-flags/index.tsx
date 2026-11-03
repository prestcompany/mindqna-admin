import { getDefaultLayout } from '@/components/layout/default-layout';
import FeatureFlagsManager from '@/components/page/feature-flags/FeatureFlagsManager';

function FeatureFlagsPage() {
  return (
    <div>
      <FeatureFlagsManager />
    </div>
  );
}

FeatureFlagsPage.getLayout = getDefaultLayout;
FeatureFlagsPage.pageHeader = {
  title: '앱 기능 관리',
  description: '앱의 기능을 켜고 끄거나, 받을 사용자를 정합니다.',
};

export default FeatureFlagsPage;
