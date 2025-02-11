import { LibraryType } from '@/client/square-library';
import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import LibraryInfoList from '@/components/page/square-library/LibraryList';

function ArticlePage() {
  return (
    <div>
      <LibraryInfoList type={LibraryType.ARTICLE} />
    </div>
  );
}

ArticlePage.getLayout = getDefaultLayout;
ArticlePage.pageHeader = pageHeader;

export default ArticlePage;
