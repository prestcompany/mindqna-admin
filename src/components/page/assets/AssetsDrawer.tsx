import { ImgItem } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import useAssets from '@/hooks/useAssets';
import { Check, ImageIcon, Loader2, Search } from 'lucide-react';
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
      <Button type='button' onClick={showModal} className='flex gap-2 items-center'>
        <ImageIcon size={16} />
        이미지 선택
      </Button>

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className='max-w-[1200px] p-0'>
          <DialogHeader className='p-6 pb-0'>
            <DialogTitle>
              <div className='flex gap-3 items-center'>
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
            </DialogTitle>
          </DialogHeader>
          <div className='flex flex-col' style={{ height: '80vh' }}>
            <div className='flex-shrink-0 p-6 bg-gray-50 border-b border-gray-200'>
              <div className='relative'>
                <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
                <Input
                  placeholder='이미지 ID나 파일명으로 검색...'
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='pl-10 h-10'
                />
              </div>
            </div>

            <div className='overflow-y-auto flex-1 p-6'>
              {filteredImgs.length === 0 && !isLoading ? (
                <div className='flex flex-col justify-center items-center py-16 text-gray-500'>
                  <ImageIcon size={48} className='mb-4 text-gray-300' />
                  <p className='text-lg font-medium'>검색 결과가 없습니다</p>
                  <p className='text-sm'>다른 검색어를 시도해보세요</p>
                </div>
              ) : (
                <div className='grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4'>
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
                        {isSelected && (
                          <div className='absolute top-2 right-2 z-10 p-1 text-white bg-blue-500 rounded-full'>
                            <Check size={12} />
                          </div>
                        )}

                        <div className='relative aspect-square overflow-hidden bg-transparent'>
                          <img
                            src={item.uri}
                            alt='asset'
                            className='h-full w-full object-contain'
                            loading='lazy'
                          />

                          <div className='absolute inset-0 bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-20' />
                        </div>

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

              {(hasNextPage || isLoading) && (
                <div ref={sentryRef} className='flex justify-center items-center py-8'>
                  <Loader2 className='h-8 w-8 animate-spin' />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AssetsDrawer;
