import { getSpaceCards } from '@/client/space';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import SpaceCardReplies from './SpaceCardReplies';
import SpaceTabList from './SpaceTabList';

function SpaceCardsTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isFetching } = useQuery({
    queryKey: ['space-cards', spaceId, page],
    queryFn: () => getSpaceCards(spaceId, page),
    enabled: active && !!spaceId,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='발급된 카드가 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((card) => {
        const expanded = expandedId === card.id;
        return (
          <div key={card.id} className='overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm'>
            <button
              type='button'
              onClick={() => setExpandedId(expanded ? null : card.id)}
              className='flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50'
            >
              <div className='min-w-0'>
                <div className='text-sm font-medium text-slate-900'>
                  #{card.order} · 템플릿 {card.templateId}
                </div>
                <div className='text-xs text-slate-500'>{dayjs(card.createdAt).format('YY.MM.DD HH:mm')}</div>
              </div>
              <div className='flex shrink-0 items-center gap-3'>
                <span className='text-xs tabular-nums text-slate-500'>
                  답변 {card.replyCount} · 댓글 {card.commentCount}
                </span>
                <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', expanded && 'rotate-180')} />
              </div>
            </button>
            {expanded ? (
              <div className='border-t border-slate-100 bg-slate-50/40 px-4 py-3'>
                <SpaceCardReplies spaceId={spaceId} cardId={card.id} />
              </div>
            ) : null}
          </div>
        );
      })}
    </SpaceTabList>
  );
}

export default SpaceCardsTab;
