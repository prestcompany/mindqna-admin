import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import SpaceList from '@/components/page/space/SpaceList';

function SpacePage() {
  return (
    <div>
      <SpaceList />
    </div>
  );
}

SpacePage.getLayout = getDefaultLayout;
SpacePage.pageHeader = pageHeader;

export default SpacePage;
