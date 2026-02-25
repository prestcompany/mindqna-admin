import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import dayjs from 'dayjs';
import React from 'react';

interface IDateRangeFieldProps {
  value?: (dayjs.Dayjs | null)[];
  onChange?: (value: (dayjs.Dayjs | null)[]) => void;
}

const dateRangeOptions = [
  { label: '오늘', value: 'today' },
  { label: '1주일', value: '1week' },
  { label: '1개월', value: '1month' },
  { label: '3개월', value: '3months' },
  { label: '6개월', value: '6months' },
  { label: '1년', value: '1year' },
];

const DateRangeField = ({ value, onChange }: IDateRangeFieldProps) => {
  const handleDateRangeChange = (v: string) => {
    if (v === 'today') {
      onChange?.([dayjs(), dayjs()]);
    } else if (v === '1week') {
      onChange?.([dayjs().subtract(1, 'week'), dayjs()]);
    } else if (v === '1month') {
      onChange?.([dayjs().subtract(1, 'month'), dayjs()]);
    } else if (v === '3months') {
      onChange?.([dayjs().subtract(3, 'months'), dayjs()]);
    } else if (v === '6months') {
      onChange?.([dayjs().subtract(6, 'months'), dayjs()]);
    } else if (v === '1year') {
      onChange?.([dayjs().subtract(1, 'year'), dayjs()]);
    }
  };

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Input
        type='date'
        className='w-[160px]'
        placeholder='시작 날짜'
        value={value?.[0]?.format('YYYY-MM-DD') ?? ''}
        onChange={(e) => {
          const v = e.target.value ? dayjs(e.target.value) : null;
          onChange?.([v, value?.[1] || null]);
        }}
      />
      <span>~</span>
      <Input
        type='date'
        className='w-[160px]'
        placeholder='종료 날짜'
        value={value?.[1]?.format('YYYY-MM-DD') ?? ''}
        onChange={(e) => {
          const v = e.target.value ? dayjs(e.target.value) : null;
          onChange?.([value?.[0] || null, v]);
        }}
      />
      <RadioGroup onValueChange={handleDateRangeChange} className='flex items-center gap-1'>
        {dateRangeOptions.map((opt) => (
          <div key={opt.value} className='flex items-center'>
            <RadioGroupItem value={opt.value} id={`range-${opt.value}`} className='peer sr-only' />
            <Label
              htmlFor={`range-${opt.value}`}
              className='cursor-pointer rounded-md border px-2 py-1 text-xs peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
            >
              {opt.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export default React.memo(DateRangeField);
