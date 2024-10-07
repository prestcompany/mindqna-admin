import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import ExpList from '@/components/page/exp/ExpList';

function ExpPage() {
  return (
    <div>
      <ExpList />
    </div>
  );
}

ExpPage.getLayout = getDefaultLayout;
ExpPage.pageHeader = pageHeader;

export default ExpPage;
