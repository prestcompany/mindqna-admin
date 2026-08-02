import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import AssetsForm from '@/components/page/assets/AssetsForm';
import AssetsList from '@/components/page/assets/AssetsList';

function AssetsPage() {
  return (
    <div className='flex flex-col gap-8'>
      <AssetsForm />
      <AssetsList />
    </div>
  );
}

AssetsPage.getLayout = getDefaultLayout;
AssetsPage.pageHeader = pageHeader;

export default AssetsPage;
