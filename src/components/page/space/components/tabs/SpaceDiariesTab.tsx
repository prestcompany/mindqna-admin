import { getSpaceDiaries } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import SpaceDiaryDetail from './SpaceDiaryDetail';
import SpaceDiaryStats from './SpaceDiaryStats';
import SpaceTabList from './SpaceTabList';

function SpaceDiariesTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isFetching } = useQuery({
    queryKey: ['space-diaries', spaceId, page],
    queryFn: () => getSpaceDiaries(spaceId, page),
    enabled: active && !!spaceId,
  });
  const items = data?.items ?? [];
  return (
    <div className='space-y-4'>
      <SpaceDiaryStats spaceId={spaceId} active={active} />
      <SpaceTabList
        isLoading={isFetching && !data}
        isEmpty={!!data && items.length === 0}
        emptyText='작성된 일기가 없습니다.'
        page={page}
        totalPage={data?.pageInfo.totalPage ?? 1}
        totalCount={data?.totalCount ?? 0}
        onPageChange={setPage}
      >
      {items.map((diary) => {
        const expanded = expandedId === diary.id;
        return (
          <div key={diary.id} className='overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm'>
            <button
              type='button'
              onClick={() => setExpandedId(expanded ? null : diary.id)}
              className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50'
            >
              <div className='flex min-w-0 items-center gap-2'>
                <Badge variant='softNeutral'>{diary.emotion}</Badge>
                <span className='truncate text-sm font-medium text-slate-900'>{diary.profile?.nickname ?? '-'}</span>
                <span className='shrink-0 text-xs text-slate-500'>{diary.date}</span>
              </div>
              <div className='flex shrink-0 items-center gap-3'>
                <span className='text-xs tabular-nums text-slate-500'>
                  댓글 {diary.commentCount} · 좋아요 {diary.likeCount}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
              </div>
            </button>
            {expanded ? (
              <div className='border-t border-slate-100 bg-slate-50/40 px-4 py-3'>
                <SpaceDiaryDetail spaceId={spaceId} diaryId={diary.id} />
                <div className='mt-2 text-[11px] text-slate-500'>{dayjs(diary.createdAt).format('YY.MM.DD HH:mm')}</div>
              </div>
            ) : null}
          </div>
        );
      })}
      </SpaceTabList>
    </div>
  );
}

export default SpaceDiariesTab;
