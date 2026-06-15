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
      className='flex cursor-pointer items-center gap-4 rounded-xl border border-border/70 bg-card px-4 py-3 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='truncate font-semibold text-foreground'>{space.spaceInfo?.name ?? '-'}</span>
          <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
          <Badge variant='softNeutral'>{space.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
          <SpaceStatusDot active={space.isActive} />
        </div>
        <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground'>
          <button
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              copyId(space.id);
            }}
            className='font-mono transition-colors hover:text-foreground'
          >
            {space.id}
          </button>
          <span>멤버 {memberCount}</span>
          <span>답변 {replies}</span>
          <span className='tabular-nums'>♥ {space.coin} · ★ {space.coinPaid}</span>
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
