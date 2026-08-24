import { ImgItem } from '@/client/types';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useAssets from '@/hooks/useAssets';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, ImageIcon, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import useInfiniteScroll from 'react-infinite-scroll-hook';

/**
 * Opens the picker. A plain trigger, not a component with an overlay of its own — the
 * parent owns the open/closed state and decides what fills its own body while picking,
 * so a picker opened from an already-open sheet swaps that sheet's content in place
 * instead of stacking a second overlay on top of it.
 */
export function AssetsPickerButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button type='button' variant='outline' onClick={onOpen}>
      <ImageIcon size={16} aria-hidden='true' />
      이미지 선택
    </Button>
  );
}

type AssetsPickerPanelProps = {
  onSelect: (img: ImgItem) => void;
  onBack: () => void;
  selectedImage?: ImgItem;
  /**
   * Sizing for the panel's own root. Every caller now lives inside a `SheetContent`,
   * which gives their ancestor a definite height, so the `h-full` default cascades.
   */
  className?: string;
};

/**
 * The selection grid itself — no Dialog, no Sheet of its own. Meant to be swapped in for
 * the parent's own form body while picking: the sheet the parent already lives in stays
 * the only overlay on screen, so Esc closes it exactly as it does everywhere else, and
 * 뒤로 is the only way back to the form without leaving the sheet.
 */
export function AssetsPickerPanel({ onSelect, onBack, selectedImage, className }: AssetsPickerPanelProps) {
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

  return (
    <div className={cn('flex flex-col', className ?? 'h-full')}>
      <div className='flex shrink-0 items-center justify-between gap-3 border-b border-border px-6 py-3'>
        <button
          type='button'
          onClick={onBack}
          className='-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted'
        >
          <ArrowLeft className='h-4 w-4' aria-hidden='true' />
          뒤로
        </button>
        <span className='text-xs text-muted-foreground'>
          이미지 선택 · <span className='tabular-nums'>{filteredImgs.length}</span>개
        </span>
      </div>

      <div className='shrink-0 border-b border-border px-6 py-3'>
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

      <div className='min-h-0 flex-1 overflow-y-auto p-6'>
        {filteredImgs.length === 0 && !isLoading ? (
          <div className='flex flex-col items-center justify-center gap-2 py-16'>
            <ImageIcon size={32} className='text-mute' aria-hidden='true' />
            <p className='text-sm font-medium text-foreground'>검색 결과가 없습니다</p>
            <p className='text-xs text-muted-foreground'>다른 검색어를 시도해 보세요</p>
          </div>
        ) : (
          // 200px min fitted four across the old dialog's fixed 1200px. The picker now
          // takes whatever width its parent sheet actually has (600–920px here), so the
          // minimum shrinks to use that room instead of standing on a width no sheet has —
          // roughly 5/6/8 columns at 600/720/920px, near the widest real parent.
          <div className='grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2'>
            {filteredImgs.map((item) => {
              const fileName = item.uri.split('/').pop() || '';
              const imgPart = fileName.includes('img') ? 'img' + fileName.split('img')[1] : fileName;
              const displayName = imgPart || `${item.id}`;
              const isSelected = selectedImage?.id === item.id;

              return (
                <button
                  type='button'
                  key={item.id}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(item)}
                  className={cn(
                    'group relative overflow-hidden rounded-lg border bg-card text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    isSelected ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-slate-300',
                  )}
                >
                  {isSelected && (
                    <div className='absolute right-2 top-2 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                      <Check size={12} aria-hidden='true' />
                    </div>
                  )}

                  <div className='relative aspect-square overflow-hidden'>
                    <img
                      src={item.uri}
                      alt={`${displayName} 이미지`}
                      className='h-full w-full object-contain'
                      loading='lazy'
                    />
                  </div>

                  <div className='border-t border-border px-2 py-1.5'>
                    <div className='truncate text-xs text-body' title={displayName}>
                      {displayName}
                    </div>
                    <div className='mt-0.5 font-mono text-xs tabular-nums text-muted-foreground'>ID {item.id}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {(hasNextPage || isLoading) && (
          <div ref={sentryRef} className='flex items-center justify-center py-8'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' aria-hidden='true' />
          </div>
        )}
      </div>
    </div>
  );
}
