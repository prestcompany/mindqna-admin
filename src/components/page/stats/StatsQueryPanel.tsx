import { getStatsMetrics, queryStats, type StatsBucketRow, type StatsCondition } from '@/client/stats';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';
import { useResetOnChange } from '@/hooks/useResetOnChange';
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

function StatsQueryPanel() {
  const [state, setState] = useState(() => initialQueryState('space'));
  const [opened, setOpened] = useState<{ index: number; row: StatsBucketRow } | null>(null);

  const { data: entities } = useQuery({ queryKey: ['stats-metrics'], queryFn: getStatsMetrics });
  const entity = entities?.find((item) => item.key === state.entity);
  const metrics = entity?.metrics ?? [];

  const filters: StatsCondition[] = toConditions(state.filters, metrics);
  const buckets: StatsCondition[] = toConditions(state.buckets, metrics);

  // Conditions are edited freely; the query only runs on the button, so a
  // half-typed threshold never reaches the server.
  // An errored draft is dropped from the payload, so querying with one would
  // answer a narrower question than the panel shows and say nothing about it.
  const blocked = hasDraftErrors(state.filters, metrics) || hasDraftErrors(state.buckets, metrics);

  const { data, refetch, isFetching, isError, error } = useQuery({
    queryKey: ['stats-query', state.entity, filters, buckets],
    queryFn: async () => {
      const result = await queryStats({ entity: state.entity, filters, buckets });
      // The conditions travel with the counts they produced, so editing the
      // panel afterwards cannot re-aim the drill-down at a different question
      // than the number beside it.
      return { rows: result.rows, asked: { filters, buckets } };
    },
    enabled: false,
  });

  // A new result set invalidates whichever row was open against the old one.
  useResetOnChange([data], () => setOpened(null));

  const rows = data?.rows ?? null;

  const renderLane = (lane: Lane, title: string, hint: string) => (
    <section className='space-y-2'>
      <div className='flex items-center gap-2'>
        <h2 className='text-sm font-medium text-foreground'>{title}</h2>
        <span className='text-xs text-muted-foreground'>{hint}</span>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto h-8'
          disabled={!metrics.length}
          onClick={() => setState((prev) => addDraft(prev, lane, metrics[0]))}
        >
          <Plus className='mr-1 h-3.5 w-3.5' />
          조건 추가
        </Button>
      </div>

      {state[lane].length ? (
        <div className='space-y-2'>
          {state[lane].map((draft) => (
            <ConditionRow
              key={draft.id}
              draft={draft}
              metrics={metrics}
              onChange={(patch) => setState((prev) => updateDraft(prev, lane, draft.id, patch))}
              onRemove={() => setState((prev) => removeDraft(prev, lane, draft.id))}
            />
          ))}
        </div>
      ) : (
        <p className='text-xs text-muted-foreground'>조건이 없습니다.</p>
      )}
    </section>
  );

  return (
    <div className='max-w-3xl space-y-6'>
      {renderLane('filters', '좁히기', '모든 조건에 함께 적용됩니다')}
      {renderLane('buckets', '묻기', '조건마다 개수를 따로 셉니다')}

      <div className='flex items-center gap-3'>
        <Button onClick={() => refetch()} disabled={!buckets.length || isFetching || blocked}>
          {isFetching ? '조회 중' : '조회'}
        </Button>
        {blocked ? <span className='text-xs text-destructive'>조건에 잘못된 값이 있습니다.</span> : null}
      </div>

      {isError ? (
        <p className='text-sm text-destructive'>
          조회에 실패했습니다. {error instanceof Error ? error.message : ''}
        </p>
      ) : null}

      {rows ? (
        <div className='space-y-2'>
          <p className='text-xs text-muted-foreground'>
            {data && data.asked.filters.length
              ? `좁히기 ${data.asked.filters.length}개 적용됨`
              : '좁히기 없이 전체 대상'}
          </p>
          <table className='w-full border-t border-border text-sm'>
          <thead>
            <tr className='text-left text-xs text-muted-foreground'>
              <th className='py-2 font-medium'>조건</th>
              <th className='py-2 text-right font-medium'>개수</th>
              <th className='w-10' />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`} className='border-t border-border'>
                <td className='py-2'>{row.label}</td>
                <td className='py-2 text-right tabular-nums'>
                  {row.count === null ? (
                    <span className='text-destructive'>{row.error === 'timeout' ? '시간 초과' : '실패'}</span>
                  ) : (
                    row.count.toLocaleString()
                  )}
                </td>
                <td className='w-10 py-2 text-right'>
                  {row.count ? (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7'
                      aria-label={`${row.label} 목록 열기`}
                      onClick={() => setOpened({ index, row })}
                    >
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      ) : null}

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

export default StatsQueryPanel;
