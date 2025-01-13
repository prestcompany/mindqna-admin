import { LibraryType } from '@/client/square-library';
import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import LibraryInfoList from '@/components/page/square-library/LibraryList';

function InfoPage() {
  return (
    <div>
      <LibraryInfoList type={LibraryType.INFO} />
    </div>
  );
}

InfoPage.getLayout = getDefaultLayout;
InfoPage.pageHeader = pageHeader;

export default InfoPage;
