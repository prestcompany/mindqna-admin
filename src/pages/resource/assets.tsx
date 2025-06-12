import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import AssetsForm from '@/components/page/assets/AssetsForm';
import AssetsList from '@/components/page/assets/AssetsList';

function AssetsPage() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='p-6 mx-auto max-w-7xl'>
        {/* 페이지 헤더 */}
        <div className='mb-8'>
          <h1 className='mb-2 text-3xl font-bold text-gray-900'>Assets 관리</h1>
          <p className='text-gray-600'>이미지 에셋을 업로드하고 관리할 수 있습니다.</p>
        </div>

        {/* 업로드 폼 */}
        <div className='mb-8'>
          <AssetsForm />
        </div>

        {/* 에셋 리스트 */}
        <div className='bg-white border border-gray-200 shadow-sm rounded-xl'>
          <div className='p-6 border-b border-gray-200'>
            <h2 className='text-xl font-semibold text-gray-800'>업로드된 이미지</h2>
            <p className='mt-1 text-sm text-gray-600'>업로드된 모든 이미지를 확인하고 관리할 수 있습니다.</p>
          </div>
          <AssetsList />
        </div>
      </div>
    </div>
  );
}

AssetsPage.getLayout = getDefaultLayout;
AssetsPage.pageHeader = pageHeader;

export default AssetsPage;
