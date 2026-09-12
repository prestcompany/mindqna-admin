import { getStatsMetrics, queryStats, type StatsBucketRow, type StatsMetric } from '@/client/stats';
import { Button } from '@/components/ui/button';
import { useResetOnChange } from '@/hooks/useResetOnChange';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import ConditionRow from './ConditionRow';
import StatsDrilldownSheet from './StatsDrilldownSheet';
import {
  addSub,
  addValue,
  blockedReason,
  initialQueryState,
  removeSub,
  removeValue,
  retarget,
  seedMain,
  setOperator,
  toBuckets,
  toFilters,
} from './services/query-state';

function StatsQueryPanel() {
  const [state, setState] = useState(() => initialQueryState('space'));
  const [opened, setOpened] = useState<{ index: number; row: StatsBucketRow } | null>(null);

  const {
    data: entities,
    isLoading: catalogLoading,
    isError: catalogFailed,
    error: catalogError,
    refetch: refetchCatalog,
  } = useQuery({ queryKey: ['stats-metrics'], queryFn: getStatsMetrics });
  const entity = entities?.find((item) => item.key === state.entity);
  const metrics = entity?.metrics ?? [];

  // The catalog decides what a condition can even be, so the main condition
  // cannot exist before it arrives.
  useResetOnChange([metrics[0]?.key], () => setState((prev) => seedMain(prev, metrics[0])));

  const filters = toFilters(state, metrics);
  const buckets = toBuckets(state, metrics);
  const blocked = blockedReason(state, metrics);

  const { data, refetch, isFetching, isError, error } = useQuery({
    queryKey: ['stats-query', state.entity, filters, buckets],
    queryFn: async () => {
      const result = await queryStats({ entity: state.entity, filters, buckets });
      // The conditions travel with the counts they produced, so editing the panel
      // afterwards cannot re-aim the drill-down at a different question than the
      // number beside it.
      return { rows: result.rows, asked: { filters, buckets } };
    },
    enabled: false,
  });

  // A new result set invalidates whichever row was open against the old one.
  useResetOnChange([data], () => setOpened(null));

  const rows = data?.rows ?? null;
  // Editing after a run leaves numbers that answer the previous question. They
  // used to sit there looking current.
  const stale = !!data && JSON.stringify(data.asked) !== JSON.stringify({ filters, buckets });

  return (
    <div className='flex flex-col gap-4'>
      <section className='rounded-xl border border-border bg-card'>
        {/* Without this the condition controls are simply dead: they disable
            themselves when the catalog is missing and used to say nothing. */}
        {!metrics.length ? (
          <CatalogNotice
            loading={catalogLoading}
            failed={catalogFailed}
            error={catalogError}
            onRetry={() => refetchCatalog()}
          />
        ) : null}

        <div className='flex flex-col gap-3 p-4'>
          <LaneHead title='메인조건' hint='값마다 결과가 따로 조회됩니다.' />
          {state.main ? (
            <ConditionRow
              draft={state.main}
              metrics={metrics}
              isMain
              onRetarget={(metric) => setState((prev) => retarget(prev, state.main!.id, metric))}
              onOperator={(op) => setState((prev) => setOperator(prev, state.main!.id, op))}
              onAddValue={(value) => setState((prev) => addValue(prev, state.main!.id, value))}
              onRemoveValue={(index) => setState((prev) => removeValue(prev, state.main!.id, index))}
            />
          ) : null}
        </div>

        <div className='flex flex-col gap-3 border-t border-border p-4'>
          <LaneHead title='서브조건' hint='모든 결과에 함께 적용됩니다. 비워두면 전체가 대상입니다.' />
          {state.subs.map((draft) => (
            <ConditionRow
              key={draft.id}
              draft={draft}
              metrics={metrics}
              isMain={false}
              onRetarget={(metric) => setState((prev) => retarget(prev, draft.id, metric))}
              onOperator={(op) => setState((prev) => setOperator(prev, draft.id, op))}
              onAddValue={(value) => setState((prev) => addValue(prev, draft.id, value))}
              onRemoveValue={(index) => setState((prev) => removeValue(prev, draft.id, index))}
              onRemove={() => setState((prev) => removeSub(prev, draft.id))}
            />
          ))}
          {!state.subs.length ? (
            <p className='text-xs text-muted-foreground'>서브조건이 없어 전체 공간이 대상입니다.</p>
          ) : null}
          <Button
            variant='ghost'
            size='sm'
            className='h-8 self-start border border-dashed border-border text-sm text-muted-foreground hover:border-solid hover:text-foreground'
            disabled={!metrics.length}
            onClick={() => setState((prev) => addSub(prev, metrics[0]))}
          >
            <Plus className='mr-1.5 h-3.5 w-3.5' />
            서브조건 추가
          </Button>
        </div>

        <div className='flex flex-wrap items-center gap-3 border-t border-border p-4'>
          <Button onClick={() => refetch()} disabled={!!blocked || isFetching}>
            {isFetching ? '조회 중' : '조회'}
          </Button>
          {/* Says one thing only: why the button is unavailable. Narrating a
              working query is noise the result table repeats a moment later. */}
          {blocked ? <span className='text-xs text-muted-foreground'>{blocked}</span> : null}
        </div>
      </section>

      {isError ? (
        <p className='rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive'>
          조회에 실패했습니다. {error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.'}
        </p>
      ) : null}

      <section className='rounded-xl border border-border bg-card'>
        {rows ? (
          <>
            <div className='flex flex-wrap items-baseline justify-between gap-3 border-b border-border p-4'>
              <h2 className='text-base font-semibold tracking-tight text-foreground'>결과</h2>
              <p className='text-xs text-muted-foreground'>
                {stale
                  ? '조건이 바뀌었습니다. 다시 조회하세요.'
                  : data && data.asked.filters.length
                    ? `서브조건 ${data.asked.filters.length}개 적용`
                    : '서브조건 없이 전체 대상'}
              </p>
            </div>
            <table className='w-full'>
              <thead>
                <tr className='border-b border-border text-left'>
                  <th className='h-9 px-4 text-xs font-normal text-muted-foreground'>조건</th>
                  <th className='h-9 px-4 text-right text-xs font-normal text-muted-foreground'>개수</th>
                  <th className='w-12' />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <StatsResultRow
                    key={`${row.label}-${index}`}
                    row={row}
                    stale={stale}
                    onOpen={row.count ? () => setOpened({ index, row }) : undefined}
                  />
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className='p-10 text-center text-sm text-muted-foreground'>조건을 적고 조회하면 여기에 결과가 나옵니다.</p>
        )}
      </section>

      <StatsDrilldownSheet
        open={!!opened}
        onClose={() => setOpened(null)}
        entity={state.entity}
        filters={data?.asked.filters ?? []}
        bucket={opened ? (data?.asked.buckets[opened.index] ?? null) : null}
        label={opened?.row.label ?? ''}
        total={opened?.row.count ?? 0}
      />
    </div>
  );
}

function LaneHead({ title, hint }: { title: string; hint: string }) {
  return (
    <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
      <h2 className='text-base font-semibold tracking-tight text-foreground'>{title}</h2>
      <p className='text-xs text-muted-foreground'>{hint}</p>
    </div>
  );
}

/**
 * The metric catalog decides what a condition can even be, so until it arrives
 * there is nothing to build one from. Saying so beats controls that sit dead.
 */
function CatalogNotice({
  loading,
  failed,
  error,
  onRetry,
}: {
  loading: boolean;
  failed: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  if (loading) {
    return <p className='border-b border-border p-4 text-sm text-muted-foreground'>지표 목록을 불러오는 중입니다.</p>;
  }
  if (!failed) return null;
  return (
    <div className='flex flex-wrap items-center gap-3 border-b border-border p-4'>
      <p className='text-sm text-destructive'>
        지표 목록을 불러오지 못해 조건을 만들 수 없습니다.
        {error instanceof Error ? ` ${error.message}` : ''}
      </p>
      <Button variant='outline' size='sm' onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}

function StatsResultRow({ row, stale, onOpen }: { row: StatsBucketRow; stale: boolean; onOpen?: () => void }) {
  return (
    <tr
      className={`border-b border-border last:border-b-0 ${onOpen ? 'cursor-pointer hover:bg-muted/40' : ''}`}
      onClick={onOpen}
    >
      <td className={`px-4 py-2 text-sm ${stale ? 'text-muted-foreground' : 'text-foreground'}`}>{row.label}</td>
      <td className={`px-4 py-2 text-right text-sm tabular-nums ${stale ? 'text-muted-foreground' : 'text-foreground'}`}>
        {row.count === null ? (
          <span className='text-destructive'>{row.error === 'timeout' ? '시간 초과' : '실패'}</span>
        ) : (
          row.count.toLocaleString()
        )}
      </td>
      <td className='w-12 px-4 py-2 text-right'>
        {onOpen ? (
          <ChevronRight className='ml-auto h-4 w-4 text-muted-foreground' aria-label={`${row.label} 목록 열기`} />
        ) : null}
      </td>
    </tr>
  );
}

export default StatsQueryPanel;
