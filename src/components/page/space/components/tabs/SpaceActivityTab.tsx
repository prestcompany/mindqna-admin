import { getSpaceActivity } from '@/client/space';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState } from 'react';
import SpaceTabList from './SpaceTabList';

function SpaceActivityTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['space-activity', spaceId, page],
    queryFn: () => getSpaceActivity(spaceId, page),
    enabled: active && !!spaceId,
  });
  const items = data?.items ?? [];
  const recentAds = data?.recentAds ?? [];
  return (
    <div className='space-y-6'>
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>접속 로그</h3>
        <SpaceTabList
          isLoading={isFetching && !data}
          isEmpty={!!data && items.length === 0}
          emptyText='접속 로그가 없습니다.'
          page={page}
          totalPage={data?.pageInfo.totalPage ?? 1}
          totalCount={data?.totalCount ?? 0}
          onPageChange={setPage}
        >
          {items.map((row) => (
            <div
              key={row.id}
              className='flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm'
            >
              <div className='min-w-0'>
                <div className='truncate font-medium text-slate-900'>@{row.user?.username ?? '알 수 없음'}</div>
                <div className='truncate font-mono text-[11px] text-slate-500'>{row.userId}</div>
              </div>
              <div className='flex shrink-0 items-center gap-3'>
                <span className='tabular-nums text-rose-600'>하트 +{row.heart}</span>
                <span className='text-xs text-slate-500'>{dayjs(row.createdAt).format('YY.MM.DD HH:mm')}</span>
              </div>
            </div>
          ))}
        </SpaceTabList>
      </section>
      {recentAds.length ? (
        <section className='space-y-2'>
          <h3 className='text-base font-semibold text-slate-900'>최근 광고 시청 ({recentAds.length})</h3>
          <div className='space-y-2'>
            {recentAds.map((ad) => (
              <div
                key={ad.id}
                className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm'
              >
                <div className='min-w-0'>
                  <div className='truncate font-medium text-slate-900'>@{ad.user?.username ?? '알 수 없음'}</div>
                  <div className='truncate font-mono text-[11px] text-slate-500'>
                    {ad.userId}
                    {ad.description ? ` · ${ad.description}` : ''}
                  </div>
                </div>
                <span className='shrink-0 text-xs text-slate-500'>{dayjs(ad.createdAt).format('YY.MM.DD HH:mm')}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default SpaceActivityTab;
