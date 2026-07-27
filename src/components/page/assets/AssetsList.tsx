import { removeAsset } from '@/client/assets';
import ClickableImagePreview from '@/components/shared/ui/clickable-image-preview';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
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
import useAssets from '@/hooks/useAssets';
import { ImageIcon, Loader2, Search, TrashIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import useInfiniteScroll from 'react-infinite-scroll-hook';
import { toast } from 'sonner';

function AssetsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const { imgs, fetchMore, isLoading, hasNextPage, refetch } = useAssets();
  const [sentryRef] = useInfiniteScroll({
    loading: isLoading,
    hasNextPage,
    onLoadMore: fetchMore,
  });

  const filteredImgs = useMemo(() => {
    if (!searchQuery) return imgs;
    return imgs.filter((img) => img.id.toString().includes(searchQuery) || img.uri.includes(searchQuery.toLowerCase()));
  }, [imgs, searchQuery]);

  const confirmTarget = confirmId === null ? undefined : imgs.find((img) => img.id === confirmId);

  const handleConfirmRemove = async () => {
    if (confirmId === null) return;
    try {
      await removeAsset(confirmId);
      // 전체 새로고침 대신 목록 쿼리만 다시 읽는다.
      await refetch();
      toast.success('이미지를 삭제했습니다.');
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmId(null);
  };

  return (
    <section className='w-full overflow-hidden rounded-lg border border-border bg-card'>
      <AlertDialog open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이미지를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 이미지를 사용 중인 화면이 있는지 확인하세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmTarget && (
            <div className='flex justify-center rounded-lg border border-border bg-muted p-4'>
              <img
                src={confirmTarget.uri}
                alt={`삭제 대상 이미지 ${confirmTarget.id}`}
                className='h-40 w-40 object-contain'
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4'>
        <div className='min-w-0'>
          <h2 className='text-base font-semibold tracking-heading text-foreground'>업로드된 이미지</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            <span className='tabular-nums'>{filteredImgs.length}</span>개
          </p>
        </div>
      </div>

      <div className='px-6'>
        <FilterBar>
          <div className='relative min-w-[260px]'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='이미지 ID 또는 파일명 검색'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 ${FILTER_CONTROL_CLASS}`}
            />
          </div>
        </FilterBar>
      </div>

      {filteredImgs.length === 0 && !isLoading ? (
        <div className='flex flex-col items-center justify-center gap-2 px-6 py-16'>
          <ImageIcon size={32} className='text-mute' aria-hidden='true' />
          <p className='text-sm font-medium text-foreground'>
            {searchQuery ? '검색 결과가 없습니다' : '업로드된 이미지가 없습니다'}
          </p>
          <p className='text-xs text-muted-foreground'>
            {searchQuery ? '다른 검색어를 시도해 보세요' : '위에서 이미지를 업로드해 보세요'}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-4 px-6 pb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
          {filteredImgs.map((item) => {
            const fileName = item.uri.split('/').pop() || '';
            const imgPart = fileName.includes('img') ? 'img' + fileName.split('img')[1] : fileName;
            const displayName = imgPart || `${item.id}`;

            return (
              <div
                key={item.id}
                className='group relative overflow-hidden rounded-lg border border-border bg-card transition-colors duration-fast hover:border-slate-300'
              >
                <div className='relative aspect-square'>
                  <ClickableImagePreview
                    src={item.uri}
                    alt={`${displayName} 이미지`}
                    triggerClassName='h-full w-full rounded-none border-0 bg-transparent p-0 hover:bg-transparent focus-visible:ring-offset-0'
                    imageClassName='h-full w-full object-contain'
                  />
                  <button
                    type='button'
                    aria-label={`${displayName} 삭제`}
                    onClick={() => setConfirmId(item.id)}
                    className='absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground opacity-0 transition-colors duration-fast hover:bg-destructive hover:text-destructive-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group-hover:opacity-100'
                  >
                    <TrashIcon size={14} aria-hidden='true' />
                  </button>
                </div>
                <div className='border-t border-border px-3 py-2'>
                  <div className='truncate text-xs text-body' title={displayName}>
                    {displayName}
                  </div>
                  <div className='mt-0.5 font-mono text-xs tabular-nums text-muted-foreground'>ID {item.id}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(hasNextPage || isLoading) && (
        <div ref={sentryRef} className='flex items-center justify-center px-6 pb-6'>
          <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' aria-hidden='true' />
        </div>
      )}
    </section>
  );
}

export default AssetsList;
