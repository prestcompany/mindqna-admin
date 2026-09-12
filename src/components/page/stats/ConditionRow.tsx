import type { StatsMetric, StatsOperator } from '@/client/stats';
import { FILTER_CONTROL_CLASS } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useResetOnChange } from '@/hooks/useResetOnChange';
import { X } from 'lucide-react';
import { useState } from 'react';
import { acceptsMoreValues, describeValue, draftError, type Draft } from './services/query-state';

const OPERATOR_LABEL: Record<StatsOperator, string> = {
  gte: '이상',
  lt: '미만',
  eq: '같음',
  in: '포함',
  between: '구간',
};

interface ConditionRowProps {
  draft: Draft;
  metrics: StatsMetric[];
  /** The main condition splits into one result row per value; a sub does not. */
  isMain: boolean;
  onRetarget: (metric: StatsMetric) => void;
  onOperator: (op: StatsOperator) => void;
  onAddValue: (value: string) => void;
  onRemoveValue: (index: number) => void;
  /** Absent on the main condition, which is required and so cannot be removed. */
  onRemove?: () => void;
}

function ConditionRow({
  draft,
  metrics,
  isMain,
  onRetarget,
  onOperator,
  onAddValue,
  onRemoveValue,
  onRemove,
}: ConditionRowProps) {
  const metric = metrics.find((item) => item.key === draft.metric);
  const error = draftError(draft, metric);

  return (
    <div className='space-y-1'>
      <div className='flex flex-wrap items-center gap-2'>
        <Select
          value={draft.metric}
          onValueChange={(key) => {
            const next = metrics.find((item) => item.key === key);
            if (next) onRetarget(next);
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

        <Select value={draft.op} onValueChange={(op) => onOperator(op as StatsOperator)}>
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

        <div className='flex min-h-8 min-w-56 flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-1.5 py-1'>
          {draft.values.map((value, index) => (
            <ValueChip
              key={value}
              label={describeValue(draft, metric, value)}
              accent={isMain}
              onRemove={() => onRemoveValue(index)}
            />
          ))}
          {metric && acceptsMoreValues(draft, isMain) ? (
            <ValueAdder draft={draft} metric={metric} onAdd={onAddValue} />
          ) : null}
        </div>

        {isMain && draft.values.length > 1 ? (
          // Ties the values to what they produce, so the split is visible before
          // the query runs rather than discovered in the result table.
          <span className='inline-flex h-6 items-center rounded-md border border-link-soft bg-link-soft px-2 text-xs font-medium text-link-deep'>
            결과 {draft.values.length}줄
          </span>
        ) : null}

        {onRemove ? (
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8'
            aria-label='서브조건 삭제'
            onMouseDown={(event) => event.preventDefault()}
            onClick={onRemove}
          >
            <X className='h-4 w-4' />
          </Button>
        ) : null}
      </div>

      {error ? <p className='pl-1 text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}

/**
 * Main-condition values are tinted because each one becomes a result row. A sub
 * condition's values are alternatives inside one condition, so they stay neutral
 * - the colour means "this is a row", not "this is a main-lane chip".
 */
function ValueChip({ label, accent, onRemove }: { label: string; accent: boolean; onRemove: () => void }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-medium tabular-nums ${
        accent ? 'border-link-soft bg-link-soft text-link-deep' : 'border-border bg-background text-foreground'
      }`}
    >
      {label}
      <button
        type='button'
        aria-label={`${label} 값 삭제`}
        className='rounded-full opacity-60 transition-opacity hover:opacity-100'
        // Keeps focus in the pending input, whose blur would otherwise re-render
        // this button out of existence before the click landed.
        onMouseDown={(event) => event.preventDefault()}
        onClick={onRemove}
      >
        <X className='h-3 w-3' />
      </button>
    </span>
  );
}

const ADDER_CLASS = 'h-6 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0';

/** The control for adding one value, which differs by what the value can be. */
function ValueAdder({ draft, metric, onAdd }: { draft: Draft; metric: StatsMetric; onAdd: (value: string) => void }) {
  const [pending, setPending] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // A value typed under the old metric or operator means nothing under the new
  // one, and the parent has already dropped the chips collected with it.
  useResetOnChange([draft.metric, draft.op], () => {
    setPending('');
    setRangeStart('');
    setRangeEnd('');
  });

  if (draft.op === 'between') {
    const ready = !!rangeStart.trim() && !!rangeEnd.trim();
    return (
      <div className='flex items-center gap-1'>
        <Input
          className={`${ADDER_CLASS} w-28`}
          type={metric.kind === 'date' ? 'date' : 'text'}
          inputMode={metric.kind === 'number' ? 'numeric' : undefined}
          value={rangeStart}
          placeholder='시작'
          aria-label='구간 시작'
          onChange={(event) => setRangeStart(event.target.value)}
        />
        <span className='text-xs text-muted-foreground'>~</span>
        <Input
          className={`${ADDER_CLASS} w-28`}
          type={metric.kind === 'date' ? 'date' : 'text'}
          inputMode={metric.kind === 'number' ? 'numeric' : undefined}
          value={rangeEnd}
          placeholder='끝'
          aria-label='구간 끝'
          onChange={(event) => setRangeEnd(event.target.value)}
        />
        <Button
          variant='ghost'
          size='sm'
          className='h-6 px-2 text-xs'
          disabled={!ready}
          onClick={() => {
            onAdd(`${rangeStart.trim()}, ${rangeEnd.trim()}`);
            setRangeStart('');
            setRangeEnd('');
          }}
        >
          추가
        </Button>
      </div>
    );
  }

  // A closed set of values is a list to pick from, never something to type. Free
  // text here was how "True" used to reach the server as a plausible `false`.
  const options =
    metric.kind === 'boolean'
      ? [
          { value: 'true', label: '예' },
          { value: 'false', label: '아니오' },
        ]
      : (metric.enumValues ?? []).map((value) => ({ value, label: value }));

  if (options.length) {
    const remaining = options.filter((option) => !draft.values.includes(option.value));
    if (!remaining.length) return null;
    return (
      <Select value='' onValueChange={onAdd}>
        <SelectTrigger className={`${ADDER_CLASS} w-28 focus:ring-0`}>
          <SelectValue placeholder={draft.values.length ? '값 추가' : '값 선택'} />
        </SelectTrigger>
        <SelectContent>
          {remaining.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (metric.kind === 'date') {
    return (
      <Input
        className={`${ADDER_CLASS} w-32`}
        type='date'
        value={pending}
        aria-label='값 추가'
        onChange={(event) => {
          const value = event.target.value;
          setPending('');
          if (value) onAdd(value);
        }}
      />
    );
  }

  const commit = () => {
    const value = pending.trim();
    setPending('');
    if (value) onAdd(value);
  };

  return (
    <Input
      className={`${ADDER_CLASS} w-24`}
      inputMode='numeric'
      value={pending}
      placeholder={draft.values.length ? '값 추가' : '값 입력'}
      aria-label='값 추가'
      onChange={(event) => setPending(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ',') {
          event.preventDefault();
          commit();
        }
      }}
      onBlur={commit}
    />
  );
}

export default ConditionRow;
