import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as React from 'react';

/**
 * A single date, optionally with a time — the counterpart to DatePickerWithRange, built on
 * the same Calendar and Popover so the two read as one family.
 *
 * It replaces `<Input type='date'>` and `<Input type='datetime-local'>`. Those render the
 * browser's own control, which means the admin showed a different date UI per browser and
 * per OS, none of them matching the calendar the dashboard already used, and none of them
 * localised to Korean. The native control also has no notion of the panel's disabled or
 * error styling.
 *
 * Value is an ISO-ish string so callers keep the shape they already store:
 * `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` when `withTime`.
 */
export function DatePicker({
  value,
  onChange,
  withTime = false,
  min,
  placeholder = '날짜 선택',
  disabled,
  className,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Show a time field beside the calendar and emit `YYYY-MM-DDTHH:mm`. */
  withTime?: boolean;
  /** Earliest selectable date, `YYYY-MM-DD`. */
  min?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const datePart = value ? value.slice(0, 10) : '';
  const timePart = withTime && value.length >= 16 ? value.slice(11, 16) : '00:00';
  const selected = datePart ? new Date(`${datePart}T00:00:00`) : undefined;

  const emit = (nextDate: string, nextTime: string) => onChange(withTime ? `${nextDate}T${nextTime}` : nextDate);

  const handleSelect = (next: Date | undefined) => {
    if (!next) return;
    emit(format(next, 'yyyy-MM-dd'), timePart);
    // A time still needs setting, so keep the popover open when it is part of the value.
    if (!withTime) setOpen(false);
  };

  const label = selected
    ? `${format(selected, 'yyyy년 M월 d일 (E)', { locale: ko })}${withTime ? ` ${timePart}` : ''}`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          disabled={disabled}
          className={cn('w-full justify-start gap-2 font-normal', !selected && 'text-muted-foreground', className)}
        >
          <CalendarIcon className='h-4 w-4 shrink-0' />
          <span className='truncate'>{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          locale={ko}
          selected={selected}
          defaultMonth={selected}
          onSelect={handleSelect}
          disabled={min ? { before: new Date(`${min}T00:00:00`) } : undefined}
          initialFocus
        />
        {withTime && (
          <div className='flex items-center gap-2 border-t border-border px-3 py-2.5'>
            <span className='text-sm text-muted-foreground'>시각</span>
            <Input
              type='time'
              value={timePart}
              onChange={(e) => emit(datePart || format(new Date(), 'yyyy-MM-dd'), e.target.value)}
              className='h-9 w-[120px]'
            />
            <Button type='button' size='sm' className='ml-auto h-9' onClick={() => setOpen(false)}>
              확인
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
