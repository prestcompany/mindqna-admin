import { SpaceDetail } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Copy, Pencil } from 'lucide-react';
import { formatDueRemovedAt, formatSpaceAge, getSpaceTypeConfig } from '../utils/space-display';
import SpaceStatusDot from './SpaceStatusDot';

interface SpaceIdentityStripProps {
  detail: SpaceDetail;
  copyId: (id: string) => void;
  onEdit?: () => void;
}

function SpaceIdentityStrip({ detail, copyId, onEdit }: SpaceIdentityStripProps) {
  const hasPremiumMember = detail.hasPremiumMember ?? detail.profiles?.some((profile) => profile.isPremium);
  const hasGoldClubMember = detail.hasGoldClubMember ?? detail.profiles?.some((profile) => profile.isGoldClub);
  const createdMeta = formatSpaceAge(detail.createdAt);
  const dueRemovedMeta = formatDueRemovedAt(detail.dueRemovedAt, detail.createdAt, hasPremiumMember);
  const typeConfig = getSpaceTypeConfig(detail.spaceInfo?.type);

  return (
    <div className='rounded-lg border border-border bg-white p-4'>
      <div className='flex items-start justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
          <span className='truncate text-lg font-semibold text-foreground'>
            {detail.spaceInfo?.name ?? '공간 상세'}
          </span>
          <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
          <Badge variant='softNeutral'>{detail.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
          <SpaceStatusDot active={detail.isActive} className='ml-1' />
          {hasPremiumMember ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
          {hasGoldClubMember ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
        </div>
        {onEdit ? (
          <button
            type='button'
            onClick={onEdit}
            className='inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-canvas hover:text-foreground'
          >
            <Pencil className='h-3 w-3' />
            수정
          </button>
        ) : null}
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground'>
        <button
          type='button'
          onClick={() => copyId(detail.id)}
          className='-mx-1.5 -my-1 inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-muted-foreground transition-colors hover:bg-canvas hover:text-foreground'
        >
          {detail.id}
          <Copy className='h-3 w-3' />
        </button>
        <span aria-hidden>·</span>
        <span>
          생성 {createdMeta.diffLabel} · {createdMeta.dateText}
        </span>
        {dueRemovedMeta ? (
          <>
            <span aria-hidden>·</span>
            <span className='font-medium text-destructive'>삭제예정 {dueRemovedMeta.dateText}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default SpaceIdentityStrip;
