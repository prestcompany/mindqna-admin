import { removeAsset } from '@/client/assets';
import useAssets from '@/hooks/useAssets';
import { Image, Input, Modal, message } from 'antd';
import { ImageIcon, Loader, Search, TrashIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import useInfiniteScroll from 'react-infinite-scroll-hook';

function AssetsList() {
  const [modal, contextHolder] = Modal.useModal();
  const [searchQuery, setSearchQuery] = useState('');

  const { imgs, fetchMore, isLoading, hasNextPage } = useAssets();
  const [sentryRef] = useInfiniteScroll({
    loading: isLoading,
    hasNextPage,
    onLoadMore: fetchMore,
  });

  // 검색 필터링
  const filteredImgs = useMemo(() => {
    if (!searchQuery) return imgs;
    return imgs.filter((img) => img.id.toString().includes(searchQuery) || img.uri.includes(searchQuery.toLowerCase()));
  }, [imgs, searchQuery]);

  const handleClickRemove = async (id: number) => {
    await modal.confirm({
      title: '정말로 삭제하시겠습니까?',
      content: (
        <Image
          width={200}
          height={200}
          src={imgs.find((img) => img.id === id)?.uri ?? ''}
          alt='removed'
          style={{ objectFit: 'cover' }}
        />
      ),
      onOk: async () => {
        try {
          await removeAsset(id);
          window.location.reload();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  return (
    <>
      {contextHolder}

      {/* 검색 영역 */}
      <div className='p-6 bg-gray-50 border-b border-gray-200'>
        <div className='flex justify-between items-center mb-4'>
          <div className='flex gap-3 items-center'>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <ImageIcon size={20} className='text-blue-600' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-800'>이미지 관리</h3>
              <p className='text-sm text-gray-600'>현재 {filteredImgs.length}개의 이미지</p>
            </div>
          </div>
        </div>
        <Input
          placeholder='이미지 ID나 파일명으로 검색...'
          prefix={<Search size={16} className='text-gray-400' />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size='large'
          allowClear
          className='max-w-md'
        />
      </div>

      {/* 이미지 그리드 */}
      {filteredImgs.length === 0 && !isLoading ? (
        <div className='flex flex-col justify-center items-center py-16 text-gray-500'>
          <ImageIcon size={48} className='mb-4 text-gray-300' />
          <p className='text-lg font-medium'>{searchQuery ? '검색 결과가 없습니다' : '업로드된 이미지가 없습니다'}</p>
          <p className='text-sm'>{searchQuery ? '다른 검색어를 시도해보세요' : '새로운 이미지를 업로드해보세요'}</p>
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
          {filteredImgs.map((item) => {
            const fileName = item.uri.split('/').pop() || '';
            const imgPart = fileName.includes('img') ? 'img' + fileName.split('img')[1] : fileName;
            const displayName = imgPart || `${item.id}`;

            return (
              <div
                key={item.id}
                className='overflow-hidden relative bg-white rounded-lg shadow-md transition-all duration-200 group hover:shadow-lg'
              >
                <div className='relative aspect-square'>
                  <Image
                    width='100%'
                    height='100%'
                    src={item.uri}
                    alt='asset'
                    style={{ objectFit: 'cover' }}
                    className='rounded-t-lg'
                  />
                  <button
                    onClick={() => handleClickRemove(item.id)}
                    className='absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg'
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
                <div className='p-3'>
                  <div className='text-xs leading-relaxed text-gray-600 line-clamp-2' title={displayName}>
                    {displayName}
                  </div>
                  <div className='mt-1 text-xs text-gray-400'>ID: {item.id}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 무한 스크롤 로딩 */}
      {(hasNextPage || isLoading) && (
        <div ref={sentryRef} className='flex justify-center items-center p-8'>
          <Loader />
        </div>
      )}
    </>
  );
}

export default AssetsList;
