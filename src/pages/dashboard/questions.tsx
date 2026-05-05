import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import CardTab from '@/components/page/dashboard/tabs/card-tab';

function QuestionsDashboardPage() {
  return (
    <div>
      <CardTab />
    </div>
  );
}

QuestionsDashboardPage.getLayout = getDefaultLayout;
QuestionsDashboardPage.pageHeader = pageHeader;

export default QuestionsDashboardPage;
