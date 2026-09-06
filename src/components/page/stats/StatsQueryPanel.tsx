import { getStatsMetrics, queryStats, type StatsBucketRow, type StatsCondition } from '@/client/stats';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import ConditionRow from './ConditionRow';
import { addDraft, initialQueryState, removeDraft, toConditions, updateDraft, type Lane } from './services/query-state';

function StatsQueryPanel() {
  const [state, setState] = useState(() => initialQueryState('space'));
  const [rows, setRows] = useState<StatsBucketRow[] | null>(null);

  const { data: entities } = useQuery({ queryKey: ['stats-metrics'], queryFn: getStatsMetrics });
  const entity = entities?.find((item) => item.key === state.entity);
  const metrics = entity?.metrics ?? [];

  const filters: StatsCondition[] = toConditions(state.filters, metrics);
  const buckets: StatsCondition[] = toConditions(state.buckets, metrics);

  // Conditions are edited freely; the query only runs on the button, so a
  // half-typed threshold never reaches the server.
  const { refetch, isFetching } = useQuery({
    queryKey: ['stats-query', state.entity, filters, buckets],
    queryFn: async () => {
      const result = await queryStats({ entity: state.entity, filters, buckets });
      setRows(result.rows);
      return result;
    },
    enabled: false,
  });

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

      <Button onClick={() => refetch()} disabled={!buckets.length || isFetching}>
        {isFetching ? '조회 중' : '조회'}
      </Button>

      {rows ? (
        <table className='w-full border-t border-border text-sm'>
          <thead>
            <tr className='text-left text-xs text-muted-foreground'>
              <th className='py-2 font-medium'>조건</th>
              <th className='py-2 text-right font-medium'>개수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className='border-t border-border'>
                <td className='py-2'>{row.label}</td>
                <td className='py-2 text-right tabular-nums'>
                  {row.count === null ? (
                    <span className='text-destructive'>{row.error === 'timeout' ? '시간 초과' : '실패'}</span>
                  ) : (
                    row.count.toLocaleString()
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export default StatsQueryPanel;
