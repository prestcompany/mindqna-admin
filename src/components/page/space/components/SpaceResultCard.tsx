import { Space } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import dayjs from 'dayjs';
import { getSpaceTypeConfig } from '../utils/space-display';
import SpaceStatusDot from './SpaceStatusDot';

interface SpaceResultCardProps {
  space: Space;
  onOpenDetail: (space: Space) => void;
  onOpenCoin: (space: Space) => void;
  copyId: (id: string) => void;
}

function SpaceResultCard({ space, onOpenDetail, onOpenCoin, copyId }: SpaceResultCardProps) {
  const typeConfig = getSpaceTypeConfig(space.spaceInfo?.type);
  const memberCount = space.spaceInfo?.members ?? space.profiles?.length ?? 0;
  const replies = space.spaceInfo?.replies ?? 0;
  const createdLabel = `D+${Math.max(dayjs().diff(dayjs(space.createdAt), 'day'), 0)}`;

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onOpenDetail(space)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenDetail(space);
        }
      }}
      className='flex cursor-pointer items-center gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300'
    >
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='truncate font-semibold text-slate-900'>{space.spaceInfo?.name ?? '-'}</span>
          <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
          <Badge variant='softNeutral'>{space.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
          <SpaceStatusDot active={space.isActive} />
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500'>
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              copyId(space.id);
            }}
            className='font-mono transition-colors hover:text-slate-900'
          >
            {space.id}
          </button>
          <span>멤버 {memberCount}</span>
          <span>답변 {replies}</span>
          <span className='tabular-nums'>하트 {space.coin} · 스타 {space.coinPaid}</span>
          <span>{createdLabel}</span>
        </div>
      </div>
      <div className='shrink-0' onClick={(event) => event.stopPropagation()}>
        <Button type='button' variant='outline' size='sm' onClick={() => onOpenCoin(space)}>
          코인 관리
        </Button>
      </div>
    </div>
  );
}

export default SpaceResultCard;
