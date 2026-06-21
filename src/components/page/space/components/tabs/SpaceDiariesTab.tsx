import { getSpaceDiaries } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import SpaceTabList from './SpaceTabList';

function SpaceDiariesTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['space-diaries', spaceId, page],
    queryFn: () => getSpaceDiaries(spaceId, page),
    enabled: active && !!spaceId,
  });
  const items = data?.items ?? [];
  return (
    <SpaceTabList
      isLoading={isFetching && !data}
      isEmpty={!!data && items.length === 0}
      emptyText='작성된 일기가 없습니다.'
      page={page}
      totalPage={data?.pageInfo.totalPage ?? 1}
      totalCount={data?.totalCount ?? 0}
      onPageChange={setPage}
    >
      {items.map((diary) => (
        <div key={diary.id} className='space-y-1.5 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <Badge variant='softNeutral'>{diary.emotion}</Badge>
              <span className='text-sm font-medium text-slate-900'>{diary.profile?.nickname ?? '-'}</span>
            </div>
            <span className='shrink-0 text-xs text-slate-500'>{diary.date}</span>
          </div>
          <p className='whitespace-pre-wrap break-words text-sm text-slate-600'>{diary.content || '내용 없음'}</p>
          <div className='text-xs tabular-nums text-slate-500'>
            댓글 {diary.commentCount} · 좋아요 {diary.likeCount} · {dayjs(diary.createdAt).format('YY.MM.DD HH:mm')}
          </div>
        </div>
      ))}
    </SpaceTabList>
  );
}

export default SpaceDiariesTab;
