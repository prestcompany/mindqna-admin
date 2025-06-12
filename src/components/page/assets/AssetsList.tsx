import { removeAsset } from '@/client/assets';
import useAssets from '@/hooks/useAssets';
import { Image, Modal, message } from 'antd';
import { Loader, TrashIcon } from 'lucide-react';
import useInfiniteScroll from 'react-infinite-scroll-hook';

function AssetsList() {
  const [modal, contextHolder] = Modal.useModal();

  const { imgs, fetchMore, isLoading, hasNextPage } = useAssets();
  const [sentryRef] = useInfiniteScroll({
    loading: isLoading,
    hasNextPage,
    onLoadMore: fetchMore,
  });

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

      <div className='grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
        {imgs.map((item) => {
          const fileName = item.uri.split('/').pop() || '';
          const imgPart = fileName.includes('img') ? 'img' + fileName.split('img')[1] : fileName;
          const displayName = imgPart || `${item.id}`;

          return (
            <div
              key={item.id}
              className='relative overflow-hidden transition-all duration-200 bg-white rounded-lg shadow-md group hover:shadow-lg'
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
      {(hasNextPage || isLoading) && (
        <div ref={sentryRef} className='flex items-center justify-center p-8'>
          <Loader />
        </div>
      )}

      {/* 네임카드 */}
    </>
  );
}

export default AssetsList;
