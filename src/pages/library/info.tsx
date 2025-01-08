import { LibraryType } from '@/client/library';
import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import LibraryInfoList from '@/components/page/library/LibraryList';

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
