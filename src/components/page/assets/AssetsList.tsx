import { removeAsset } from '@/client/assets';
import ClickableImagePreview from '@/components/shared/ui/clickable-image-preview';
import useAssets from '@/hooks/useAssets';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { ImageIcon, Loader, Search, TrashIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { toast } from 'sonner';

function AssetsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const { imgs, fetchMore, isLoading, hasNextPage } = useAssets();
  const [sentryRef] = useInfiniteScroll({
    loading: isLoading,
    hasNextPage,
    onLoadMore: fetchMore,
  });

  const filteredImgs = useMemo(() => {
    if (!searchQuery) return imgs;
    return imgs.filter((img) => img.id.toString().includes(searchQuery) || img.uri.includes(searchQuery.toLowerCase()));
  }, [imgs, searchQuery]);

  const handleClickRemove = (id: number) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (confirmId === null) return;
    try {
      await removeAsset(confirmId);
      window.location.reload();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmId(null);
  };

  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정말로 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmId && (
                <img
                  width={200}
                  height={200}
                  src={imgs.find((img) => img.id === confirmId)?.uri ?? ''}
                  alt='removed'
                  className='object-cover'
                />
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
        <div className='relative max-w-md'>
          <Search size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400' />
          <Input
            placeholder='이미지 ID나 파일명으로 검색...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10 h-10'
          />
        </div>
      </div>

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
                  <ClickableImagePreview
                    src={item.uri}
                    alt={`${displayName} 이미지`}
                    triggerClassName='h-full w-full rounded-none rounded-t-lg border-0 bg-transparent p-0 hover:bg-transparent focus-visible:ring-offset-0'
                    imageClassName='h-full w-full rounded-t-lg object-cover'
                  />
                  <button
                    onClick={() => handleClickRemove(item.id)}
                    className='absolute top-2 right-2 z-10 rounded-full bg-red-500 p-1.5 text-white opacity-0 shadow-lg transition-opacity duration-200 hover:bg-red-600 group-hover:opacity-100'
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

      {(hasNextPage || isLoading) && (
        <div ref={sentryRef} className='flex justify-center items-center p-8'>
          <Loader />
        </div>
      )}
    </>
  );
}

export default AssetsList;
