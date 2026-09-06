import type { StatsMetric, StatsOperator } from '@/client/stats';
import { FILTER_CONTROL_CLASS } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import type { Draft } from './services/query-state';
import { draftError } from './services/query-state';

const OPERATOR_LABEL: Record<StatsOperator, string> = {
  gte: '이상',
  lt: '미만',
  eq: '같음',
  in: '포함',
  between: '구간',
};

const PLACEHOLDER: Record<StatsOperator, string> = {
  gte: '20',
  lt: '20',
  eq: '20',
  in: 'ko, en',
  between: '10, 19',
};

interface ConditionRowProps {
  draft: Draft;
  metrics: StatsMetric[];
  onChange: (patch: Partial<Omit<Draft, 'id'>>) => void;
  onRemove: () => void;
}

function ConditionRow({ draft, metrics, onChange, onRemove }: ConditionRowProps) {
  const metric = metrics.find((item) => item.key === draft.metric);
  const error = draftError(draft, metric);
  const hint = metric?.enumValues?.length ? metric.enumValues.join(', ') : PLACEHOLDER[draft.op];

  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-2'>
        <Select
          value={draft.metric}
          onValueChange={(metricKey) => {
            const next = metrics.find((item) => item.key === metricKey);
            onChange({ metric: metricKey, op: next?.operators[0], value: '' });
          }}
        >
          <SelectTrigger className={`${FILTER_CONTROL_CLASS} w-40`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {metrics.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={draft.op} onValueChange={(op) => onChange({ op: op as StatsOperator, value: '' })}>
          <SelectTrigger className={`${FILTER_CONTROL_CLASS} w-24`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(metric?.operators ?? []).map((op) => (
              <SelectItem key={op} value={op}>
                {OPERATOR_LABEL[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className={`${FILTER_CONTROL_CLASS} w-48`}
          value={draft.value}
          placeholder={hint}
          onChange={(event) => onChange({ value: event.target.value })}
        />

        <Button variant='ghost' size='icon' className='h-8 w-8' aria-label='조건 삭제' onClick={onRemove}>
          <X className='h-4 w-4' />
        </Button>
      </div>

      {error ? <p className='pl-1 text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}

export default ConditionRow;
