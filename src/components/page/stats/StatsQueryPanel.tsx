import { getStatsMetrics, queryStats, type StatsBucketRow, type StatsCondition, type StatsMetric } from '@/client/stats';
import { Button } from '@/components/ui/button';
import { useResetOnChange } from '@/hooks/useResetOnChange';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import ConditionRow from './ConditionRow';
import StatsDrilldownSheet from './StatsDrilldownSheet';
import {
  addDraft,
  hasDraftErrors,
  initialQueryState,
  removeDraft,
  toConditions,
  updateDraft,
  type Lane,
} from './services/query-state';

const LANES: { name: Lane; step: string; title: string; hint: string }[] = [
  // The numbers are the order the two lanes actually run in - narrow, then count -
  // not decoration. Two-word labels left it to the operator to guess which was
  // shared and which was per-row.
  { name: 'filters', step: '1', title: '대상 좁히기', hint: '아래 모든 항목에 함께 적용됩니다. 비워두면 전체가 대상입니다.' },
  { name: 'buckets', step: '2', title: '세어보기', hint: '항목마다 개수를 따로 냅니다.' },
];

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

  const filters: StatsCondition[] = toConditions(state.filters, metrics);
  const buckets: StatsCondition[] = toConditions(state.buckets, metrics);

  // An errored draft is dropped from the payload, so querying with one would
  // answer a narrower question than the panel shows and say nothing about it.
  const invalid = hasDraftErrors(state.filters, metrics) || hasDraftErrors(state.buckets, metrics);

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
  // A row with an empty value is dropped by toConditions, so buckets is empty in
  // two different situations. Telling someone who just added a row to "add a row"
  // is the panel blaming them for its own missing input.
  // Rows the operator added to 좁히기 but never filled: dropped from the payload,
  // so the result is wider than the panel suggests.
  const ignoredFilters = state.filters.length - filters.length;
  const blockedReason = invalid
    ? '조건에 잘못된 값이 있습니다.'
    : buckets.length
      ? null
      : state.buckets.length
        ? '세어볼 조건의 값을 입력하세요.'
        : '세어볼 조건을 하나 이상 추가하세요.';

  return (
    <div className='flex flex-col gap-4'>
      <section className='rounded-xl border border-border bg-card'>
        {/* Without this the 조건 추가 buttons are simply dead: they disable
            themselves when the catalog is missing and used to say nothing. */}
        {!metrics.length ? <CatalogNotice loading={catalogLoading} failed={catalogFailed} error={catalogError} onRetry={() => refetchCatalog()} /> : null}
        {LANES.map(({ name, step, title, hint }) => (
          <div key={name} className='flex flex-col gap-3 border-border p-4 [&+&]:border-t'>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
              <span className='inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border font-mono text-xs font-medium text-muted-foreground'>
                {step}
              </span>
              <h2 className='text-base font-semibold tracking-tight text-foreground'>{title}</h2>
              <p className='text-xs text-muted-foreground'>{hint}</p>
            </div>

            {state[name].map((draft) => (
              <ConditionRow
                key={draft.id}
                draft={draft}
                metrics={metrics}
                onChange={(patch) => setState((prev) => updateDraft(prev, name, draft.id, patch))}
                onRemove={() => setState((prev) => removeDraft(prev, name, draft.id))}
              />
            ))}

            <AddConditionButton
              metrics={metrics}
              onAdd={(metric) => setState((prev) => addDraft(prev, name, metric))}
            />
          </div>
        ))}

        <div className='flex flex-wrap items-center gap-3 border-t border-border p-4'>
          <Button onClick={() => refetch()} disabled={!!blockedReason || isFetching}>
            {isFetching ? '조회 중' : '조회'}
          </Button>
          {blockedReason ? (
            <span className={`text-xs ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}>{blockedReason}</span>
          ) : ignoredFilters > 0 ? (
            // Not blocking - an empty 좁히기 row is harmless - but the count would
            // otherwise come back wider than the panel looks, with nothing said.
            <span className='text-xs text-muted-foreground'>
              값이 비어 있는 좁히기 조건 {ignoredFilters}개는 무시됩니다.
            </span>
          ) : null}
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
                {data && data.asked.filters.length ? `좁히기 ${data.asked.filters.length}개 적용` : '좁히기 없이 전체 대상'}
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
                    onOpen={row.count ? () => setOpened({ index, row }) : undefined}
                  />
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className='p-10 text-center text-sm text-muted-foreground'>
            조건을 추가하고 조회하면 여기에 개수가 나옵니다.
          </p>
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

/**
 * The metric catalog decides what a condition can even be, so until it arrives
 * there is nothing to add. Saying so beats a button that ignores clicks.
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
    return (
      <p className='border-b border-border p-4 text-sm text-muted-foreground'>지표 목록을 불러오는 중입니다.</p>
    );
  }
  if (!failed) return null;
  return (
    <div className='flex flex-wrap items-center gap-3 border-b border-border p-4'>
      <p className='text-sm text-destructive'>
        지표 목록을 불러오지 못해 조건을 추가할 수 없습니다.
        {error instanceof Error ? ` ${error.message}` : ''}
      </p>
      <Button variant='outline' size='sm' onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}

/** Sits directly under the rows it adds to, rather than across the panel from them. */
function AddConditionButton({ metrics, onAdd }: { metrics: StatsMetric[]; onAdd: (metric: StatsMetric) => void }) {
  return (
    <Button
      variant='ghost'
      size='sm'
      className='h-8 self-start border border-dashed border-border text-sm text-muted-foreground hover:border-solid hover:text-foreground'
      disabled={!metrics.length}
      onClick={() => onAdd(metrics[0])}
    >
      <Plus className='mr-1.5 h-3.5 w-3.5' />
      조건 추가
    </Button>
  );
}

function StatsResultRow({ row, onOpen }: { row: StatsBucketRow; onOpen?: () => void }) {
  return (
    <tr
      className={`border-b border-border last:border-b-0 ${onOpen ? 'cursor-pointer hover:bg-muted/40' : ''}`}
      onClick={onOpen}
    >
      <td className='px-4 py-2 text-sm text-foreground'>{row.label}</td>
      <td className='px-4 py-2 text-right text-sm tabular-nums text-foreground'>
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
