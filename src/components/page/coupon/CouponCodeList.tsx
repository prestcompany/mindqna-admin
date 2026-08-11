import type { CouponBatch, CouponCode } from '@/client/coupon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import useCouponBatchCodes from '@/hooks/useCouponBatchCodes';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { copyText } from '@/lib/clipboard';
import dayjs from 'dayjs';
import { Copy, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from './errorMessage';

/**
 * Above this the panel falls back to server paging. New batches are capped at 1000 by
 * `MAX_ISSUE_COUNT`, but batches migrated from the pre-batch schema can exceed it — the
 * rollout doc has admins check for exactly that with `HAVING COUNT(*) > 1000`.
 */
const MAX_CLIENT_SIDE_CODES = 1000;

/**
 * Newline is what a spreadsheet wants and comma is what a message or a CSV field wants —
 * and a newline-joined list pasted into a single-line input arrives as one run-on string
 * with no separator at all. Offer both rather than guess.
 */
const SEPARATORS = [
  { label: '쉼표로 복사', join: ', ' },
  { label: '줄바꿈으로 복사', join: '\n' },
] as const;

const FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'UNUSED', label: '미사용' },
  { value: 'USED', label: '사용' },
] as const;

type Filter = (typeof FILTERS)[number]['value'];

function CouponCodeList({ batch }: { batch: CouponBatch }) {
  const isShared = batch.issueMode === 'SHARED';
  // An individual batch is a bounded list of codes, so fetch it whole: filtering,
  // searching and copying then need no network at all. A shared batch's redemption log
  // is unbounded when maxUseCount is 0, so it stays server-paged.
  const canLoadAll = !isShared && batch.codeCount <= MAX_CLIENT_SIDE_CODES;

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 300);

  const { items, totalPage, isLoading, isError, refetch } = useCouponBatchCodes(batch.batchId, page, true, {
    all: canLoadAll,
    // Only the server-paged shared list needs the server to search; the individual list
    // already holds every row.
    search: isShared ? debouncedQuery : undefined,
  });

  // Server-paged lists can shrink under the page the admin is on — a delete keeps redeemed
  // codes and drops the rest. The parent invalidates this query but cannot reach `page`.
  useEffect(() => {
    if (!canLoadAll && !isLoading && !isError && page > totalPage) setPage(totalPage);
  }, [canLoadAll, isLoading, isError, page, totalPage]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const visible = useMemo(() => {
    if (!canLoadAll) return items;

    const q = debouncedQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === 'USED' && !item.usedAt) return false;
      if (filter === 'UNUSED' && item.usedAt) return false;
      if (!q) return true;
      return item.code.toLowerCase().includes(q) || (item.username ?? '').toLowerCase().includes(q);
    });
  }, [canLoadAll, items, filter, debouncedQuery]);

  const usedCount = batch.usedCount;
  const unusedCount = Math.max(0, batch.codeCount - usedCount);

  const copyVisible = async (join: string) => {
    try {
      // No await before the write: the rows are already in memory, so the clipboard call
      // stays inside the click's user-activation window and WebKit accepts it.
      const text = Array.from(new Set(visible.map((item) => item.code))).join(join);
      if (!text) {
        toast.error('복사할 코드가 없습니다.');
        return;
      }
      await copyText(text);
      toast.success(`코드 ${visible.length}개를 복사했습니다.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const copyOne = async (code: string) => {
    try {
      await copyText(code);
      toast.success(`${code} 복사했습니다.`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const gridClass = isShared
    ? 'grid w-full grid-cols-[minmax(0,1fr)_130px_20px] items-center gap-3'
    : 'grid w-full grid-cols-[minmax(0,13rem)_5rem_minmax(0,1fr)_130px_20px] items-center gap-3';

  const renderRows = () => {
    if (isLoading) {
      // Skeleton rows on the same grid: a lone spinner has a different height from the
      // list, so the panel jumps the moment the data lands.
      return Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={`h-9 px-2 ${gridClass}`}>
          {!isShared && <span className='h-2 w-24 rounded-full bg-muted' />}
          {!isShared && <span className='h-2 w-10 rounded-full bg-muted' />}
          <span className='h-2 w-16 rounded-full bg-muted' />
          <span className='h-2 w-20 rounded-full bg-muted' />
          <span />
        </div>
      ));
    }

    if (visible.length === 0) {
      const message = debouncedQuery.trim()
        ? `‘${debouncedQuery.trim()}’에 해당하는 ${isShared ? '사용 내역' : '코드'}가 없습니다.`
        : isShared
          ? '아직 사용 내역이 없습니다.'
          : filter === 'USED'
            ? '사용된 코드가 없습니다.'
            : filter === 'UNUSED'
              ? '미사용 코드가 없습니다.'
              : '표시할 코드가 없습니다.';

      return <div className='px-3 py-6 text-center text-sm text-slate-500'>{message}</div>;
    }

    return visible.map((item: CouponCode, index) => (
      <button
        key={`${item.codeId}-${index}`}
        type='button'
        onClick={() => copyOne(item.code)}
        aria-label={`코드 ${item.code} 복사`}
        className={`group h-9 rounded-md px-2 text-left text-sm transition-colors duration-fast hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${gridClass}`}
      >
        {!isShared && <span className='truncate font-mono text-slate-900'>{item.code}</span>}
        {!isShared && (
          <span>
            <Badge variant={item.usedAt ? 'dotSuccess' : 'dotNeutral'}>{item.usedAt ? '사용' : '미사용'}</Badge>
          </span>
        )}
        <span className='truncate text-slate-700'>{item.username ?? ''}</span>
        <span className='tabular-nums text-xs text-slate-500'>
          {item.usedAt ? dayjs(item.usedAt).format('YY.MM.DD HH:mm') : ''}
        </span>
        <Copy className='h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100' />
      </button>
    ));
  };

  return (
    <div className='overflow-hidden rounded-lg border border-border bg-card'>
      {/* Identity: without it the panel is an anonymous list and the admin loses track of
          which row they opened. It also holds the 발급일 and 모드 the table no longer shows. */}
      <div className='flex flex-wrap items-start gap-3 border-b border-border px-3 py-2.5'>
        <div className='min-w-0'>
          <div className='truncate text-sm font-semibold tracking-heading text-slate-900'>{batch.name}</div>
          <div className='truncate text-xs text-slate-600'>
            {isShared ? (
              <>
                공용 코드 <span className='font-mono text-slate-900'>{batch.code}</span>
              </>
            ) : (
              '개별 코드'
            )}
            {' · '}
            {dayjs(batch.createdAt).format('YY.MM.DD')} 발급 {' · '}
            {dayjs(batch.startAt).format('YY.MM.DD')} – {dayjs(batch.dueAt).format('YY.MM.DD')}
          </div>
        </div>

        <div className='ml-auto flex gap-4'>
          {isShared ? (
            <>
              <Count label='사용' value={usedCount} />
              <Count label='최대' value={batch.capacity === 0 ? '무제한' : batch.capacity} />
            </>
          ) : (
            <>
              <Count label='전체' value={batch.codeCount} />
              <Count label='사용' value={usedCount} />
              <Count label='미사용' value={unusedCount} />
            </>
          )}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2 border-b border-border px-3 py-2'>
        {canLoadAll && (
          <div className='inline-flex overflow-hidden rounded-md border border-border'>
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type='button'
                onClick={() => setFilter(option.value)}
                aria-pressed={filter === option.value}
                className={`h-8 border-r border-border px-3 text-xs font-medium transition-colors duration-fast last:border-r-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring ${
                  filter === option.value ? 'bg-slate-900 text-white' : 'bg-card text-slate-700 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {(canLoadAll || isShared) && (
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isShared ? '사용자 검색' : '코드 · 사용자 검색'}
            className='h-8 w-full min-w-[140px] sm:w-[200px]'
          />
        )}

        {!isShared && (
          <div className='ml-auto flex items-center gap-1'>
            {SEPARATORS.map((separator) => (
              <Button
                key={separator.label}
                variant='outline'
                size='sm'
                className='h-8'
                onClick={() => copyVisible(separator.join)}
                disabled={isLoading || visible.length === 0}
              >
                <Copy className='mr-1.5 h-3.5 w-3.5' />
                {separator.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {isError ? (
        <div className='flex items-center justify-between gap-3 px-3 py-4 text-sm'>
          <span className='text-slate-500'>코드를 불러오지 못했습니다.</span>
          <div className='flex items-center gap-1'>
            {/* 다시 시도 re-requests the page that just failed, so a deep page needs a way out. */}
            {page > 1 && (
              <Button variant='outline' size='sm' className='h-8' onClick={() => setPage(1)}>
                첫 페이지로
              </Button>
            )}
            <Button variant='outline' size='sm' className='h-8' onClick={() => refetch()}>
              다시 시도
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={`grid ${gridClass} h-7 border-b border-border bg-muted/40 px-2 text-[11px] text-slate-600`}>
            {!isShared && <span>코드</span>}
            {!isShared && <span>상태</span>}
            <span>사용자</span>
            <span>사용 시각</span>
            <span />
          </div>

          {/* Capped so expanding a 500-code batch shifts the table by the same amount as
              expanding a 3-code one, and the toolbar above stays reachable. */}
          <div className='max-h-[280px] overflow-y-auto p-1'>{renderRows()}</div>
        </>
      )}

      {!isError && (
        <div className='flex items-center gap-2 border-t border-border px-3 py-2 text-xs text-slate-500'>
          {canLoadAll ? (
            <span>
              전체 {batch.codeCount}개 중 {visible.length}개 표시
            </span>
          ) : (
            <>
              <span>서버 페이지</span>
              <div className='ml-auto flex items-center gap-1'>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8'
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  이전
                </Button>
                <span className='px-2 tabular-nums text-slate-600'>
                  {page} / {totalPage}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8'
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPage}
                >
                  다음
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number | string }) {
  return (
    <div className='text-right'>
      <div className='text-[15px] font-semibold tabular-nums tracking-heading text-slate-900'>{value}</div>
      <div className='text-[10px] text-slate-600'>{label}</div>
    </div>
  );
}

export default CouponCodeList;
