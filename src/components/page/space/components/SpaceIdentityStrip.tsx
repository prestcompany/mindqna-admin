import { SpaceDetail } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { formatDueRemovedAt, formatSpaceAge, getSpaceTypeConfig } from '../utils/space-display';
import SpaceStatusDot from './SpaceStatusDot';

interface SpaceIdentityStripProps {
  detail: SpaceDetail;
  copyId: (id: string) => void;
}

function SpaceIdentityStrip({ detail, copyId }: SpaceIdentityStripProps) {
  const hasPremiumMember = detail.hasPremiumMember ?? detail.profiles?.some((profile) => profile.isPremium);
  const hasGoldClubMember = detail.hasGoldClubMember ?? detail.profiles?.some((profile) => profile.isGoldClub);
  const createdMeta = formatSpaceAge(detail.createdAt);
  const dueRemovedMeta = formatDueRemovedAt(detail.dueRemovedAt, detail.createdAt, hasPremiumMember);
  const typeConfig = getSpaceTypeConfig(detail.spaceInfo?.type);

  return (
    <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
        <span className='truncate text-lg font-semibold text-slate-900'>{detail.spaceInfo?.name ?? '공간 상세'}</span>
        <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
        <Badge variant='softNeutral'>{detail.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
        <SpaceStatusDot active={detail.isActive} className='ml-1' />
        {hasPremiumMember ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
        {hasGoldClubMember ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
      </div>
      <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500'>
        <button
          type='button'
          onClick={() => copyId(detail.id)}
          className='-mx-1.5 -my-1 inline-flex items-center gap-1 rounded px-1.5 py-1 font-mono text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900'
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
            <span className='font-medium text-rose-600'>삭제예정 {dueRemovedMeta.dateText}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default SpaceIdentityStrip;
