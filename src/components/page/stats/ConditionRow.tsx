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

/**
 * Prefixed with 예: so an empty field cannot be mistaken for a filled one. A bare
 * "20" here read as a value the operator had already entered, which made the
 * disabled 조회 button look broken rather than waiting for input.
 */
const PLACEHOLDER: Record<StatsOperator, string> = {
  gte: '예: 20',
  lt: '예: 20',
  eq: '예: 20',
  in: '예: ko, en',
  between: '예: 10, 19',
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
  const [rangeStart = '', rangeEnd = ''] = draft.value.split(',').map((part) => part.trim());
  const hint = metric?.enumValues?.length ? `예: ${metric.enumValues.slice(0, 2).join(', ')}` : PLACEHOLDER[draft.op];

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

        {metric?.kind === 'boolean' && draft.op === 'eq' ? (
          // A free text box here could only fail toward false, which is a valid
          // boolean, so the wrong question got a plausible answer.
          <Select value={draft.value} onValueChange={(value) => onChange({ value })}>
            <SelectTrigger className={`${FILTER_CONTROL_CLASS} w-48`}>
              <SelectValue placeholder='선택' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='true'>예</SelectItem>
              <SelectItem value='false'>아니오</SelectItem>
            </SelectContent>
          </Select>
        ) : metric?.kind === 'date' && draft.op === 'between' ? (
          // Two pickers rather than one comma-separated box: free text here was
          // the one date path a picker did not cover.
          <div className='flex items-center gap-1'>
            <Input
              className={`${FILTER_CONTROL_CLASS} w-36`}
              type='date'
              value={rangeStart}
              aria-label='시작일'
              onChange={(event) => onChange({ value: `${event.target.value}, ${rangeEnd}` })}
            />
            <span className='text-xs text-muted-foreground'>~</span>
            <Input
              className={`${FILTER_CONTROL_CLASS} w-36`}
              type='date'
              value={rangeEnd}
              aria-label='종료일'
              onChange={(event) => onChange({ value: `${rangeStart}, ${event.target.value}` })}
            />
          </div>
        ) : (
          <Input
            className={`${FILTER_CONTROL_CLASS} w-48`}
            type={metric?.kind === 'date' ? 'date' : 'text'}
            value={draft.value}
            placeholder={hint}
            onChange={(event) => onChange({ value: event.target.value })}
          />
        )}

        <Button variant='ghost' size='icon' className='h-8 w-8' aria-label='조건 삭제' onClick={onRemove}>
          <X className='h-4 w-4' />
        </Button>
      </div>

      {error ? <p className='pl-1 text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}

export default ConditionRow;
