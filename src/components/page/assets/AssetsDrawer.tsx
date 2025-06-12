import { ImgItem } from '@/client/types';
import useAssets from '@/hooks/useAssets';
import { Button, Image, Input, Modal, Spin } from 'antd';
import { Check, ImageIcon, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import useInfiniteScroll from 'react-infinite-scroll-hook';

type AssetsDrawerProps = {
  onClick: (img: ImgItem) => void;
  selectedImage?: ImgItem;
};

function AssetsDrawer({ onClick, selectedImage }: AssetsDrawerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { imgs, isLoading, fetchMore, hasNextPage } = useAssets();

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

  const showModal = () => {
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setSearchQuery('');
  };

  const handleImageSelect = (img: ImgItem) => {
    onClick(img);
    handleCancel();
  };

  return (
    <>
      <Button type='primary' icon={<ImageIcon size={16} />} onClick={showModal} className='flex items-center gap-2'>
        이미지 선택
      </Button>

      <Modal
        title={
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-100 rounded-lg'>
              <ImageIcon size={20} className='text-blue-600' />
            </div>
            <div>
              <div className='font-semibold'>이미지 선택</div>
              <div className='text-sm font-normal text-gray-500'>
                사용할 이미지를 선택해주세요. [현재 {filteredImgs.length}개]
              </div>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={1200}
        style={{ top: 20 }}
        bodyStyle={{ padding: 0 }}
      >
        <div className='flex flex-col' style={{ height: '80vh' }}>
          {/* 검색 영역 */}
          <div className='flex-shrink-0 p-6 border-b border-gray-200 bg-gray-50'>
            <Input
              placeholder='이미지 ID나 파일명으로 검색...'
              prefix={<Search size={16} className='text-gray-400' />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size='large'
              allowClear
            />
          </div>

          {/* 이미지 그리드 */}
          <div className='flex-1 p-6 overflow-y-auto'>
            {filteredImgs.length === 0 && !isLoading ? (
              <div className='flex flex-col items-center justify-center py-16 text-gray-500'>
                <ImageIcon size={48} className='mb-4 text-gray-300' />
                <p className='text-lg font-medium'>검색 결과가 없습니다</p>
                <p className='text-sm'>다른 검색어를 시도해보세요</p>
              </div>
            ) : (
              <div className='grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8'>
                {filteredImgs.map((item) => {
                  const fileName = item.uri.split('/').pop() || '';
                  const imgPart = fileName.includes('img') ? 'img' + fileName.split('img')[1] : fileName;
                  const displayName = imgPart || `${item.id}`;
                  const isSelected = selectedImage?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`
                        relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200
                        ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                            : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                        }
                      `}
                      onClick={() => handleImageSelect(item)}
                    >
                      {/* 선택 체크 아이콘 */}
                      {isSelected && (
                        <div className='absolute z-10 p-1 text-white bg-blue-500 rounded-full top-2 right-2'>
                          <Check size={12} />
                        </div>
                      )}

                      {/* 이미지 */}
                      <div className='relative overflow-hidden bg-gray-100 aspect-square'>
                        <Image
                          src={item.uri}
                          alt='asset'
                          className='object-cover w-full h-full'
                          preview={false}
                          loading='lazy'
                        />

                        {/* 호버 오버레이 */}
                        <div className='absolute inset-0 transition-all duration-200 bg-black bg-opacity-0 group-hover:bg-opacity-20' />
                      </div>

                      {/* 이미지 정보 */}
                      <div className='p-2 bg-white'>
                        <div className='text-xs text-gray-600 truncate' title={displayName}>
                          {displayName.length > 12 ? `${displayName.substring(0, 12)}...` : displayName}
                        </div>
                        <div className='text-xs text-gray-400'>ID: {item.id}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 무한 스크롤 로딩 */}
            {(hasNextPage || isLoading) && (
              <div ref={sentryRef} className='flex items-center justify-center py-8'>
                <Spin size='large' />
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

export default AssetsDrawer;
