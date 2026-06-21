import { getSpaceCards } from '@/client/space';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import SpaceTabList from './SpaceTabList';

function SpaceCardsTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
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
      {items.map((card) => (
        <div
          key={card.id}
          className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
        >
          <div className='min-w-0'>
            <div className='text-sm font-medium text-slate-900'>
              #{card.order} · 템플릿 {card.templateId}
            </div>
            <div className='text-xs text-slate-500'>{dayjs(card.createdAt).format('YY.MM.DD HH:mm')}</div>
          </div>
          <div className='shrink-0 text-xs tabular-nums text-slate-500'>
            답변 {card.replyCount} · 댓글 {card.commentCount}
          </div>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default SpaceCardsTab;
