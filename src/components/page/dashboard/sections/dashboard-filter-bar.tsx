import { DashboardGrowthGranularity } from '@/client/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import { Check, CalendarRange, Globe2 } from 'lucide-react';
import { Locale } from '@/client/types';
import { DashboardRangePreset } from '../types/growth';
import { getLocaleLabel } from '../utils/growth-mappers';

interface DashboardFilterBarProps {
  granularity: DashboardGrowthGranularity;
  onGranularityChange: (granularity: DashboardGrowthGranularity) => void;
  preset: DashboardRangePreset;
  onPresetChange: (preset: DashboardRangePreset) => void;
  startedAt: dayjs.Dayjs | null;
  endedAt: dayjs.Dayjs | null;
  setStartedAt: (date: dayjs.Dayjs | null) => void;
  setEndedAt: (date: dayjs.Dayjs | null) => void;
  locales: Locale[];
  selectedLocales: Locale[];
  onToggleLocale: (locale: Locale) => void;
  onSelectAllLocales: () => void;
}

const monthPresetOptions: { value: DashboardRangePreset; label: string }[] = [
  { value: '6m', label: '최근 6개월' },
  { value: '12m', label: '최근 12개월' },
  { value: 'ytd', label: '올해' },
  { value: 'custom', label: '월 범위 선택' },
];
const dayPresetOptions: { value: DashboardRangePreset; label: string }[] = [
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
  { value: '90d', label: '최근 90일' },
  { value: 'custom', label: '직접 선택' },
];

const MONTH_OPTION_COUNT = 36;

function buildMonthOptions() {
  const currentMonth = dayjs().startOf('month');

  return Array.from({ length: MONTH_OPTION_COUNT }, (_, index) => {
    const month = currentMonth.subtract(index, 'month');

    return {
      value: month.format('YYYY-MM-01'),
      label: month.format('YYYY.MM'),
    };
  });
}

function DashboardFilterBar({
  granularity,
  onGranularityChange,
  preset,
  onPresetChange,
  startedAt,
  endedAt,
  setStartedAt,
  setEndedAt,
  locales,
  selectedLocales,
  onToggleLocale,
  onSelectAllLocales,
}: DashboardFilterBarProps) {
  const allSelected = selectedLocales.length === locales.length;
  const monthOptions = buildMonthOptions();
  const startedMonthValue = (startedAt ?? dayjs().startOf('month')).startOf('month').format('YYYY-MM-01');
  const endedMonthValue = (endedAt ?? dayjs().endOf('month')).startOf('month').format('YYYY-MM-01');
  const presetOptions = granularity === 'day' ? dayPresetOptions : monthPresetOptions;

  return (
    <Card className='sticky top-0 z-30 border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85'>
      <CardContent className='space-y-4 p-4'>
        <section className='rounded-2xl border border-border bg-white p-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              variant={granularity === 'month' ? 'default' : 'outline'}
              size='sm'
              aria-pressed={granularity === 'month'}
              className={cn(
                'h-10 rounded-full px-4 text-sm transition-all',
                granularity === 'month'
                  ? 'bg-foreground text-white hover:bg-foreground'
                  : 'border-border bg-white text-foreground hover:border-info/25 hover:bg-info/10 hover:text-info',
              )}
              onClick={() => onGranularityChange('month')}
            >
              월별 보기
            </Button>
            <Button
              type='button'
              variant={granularity === 'day' ? 'default' : 'outline'}
              size='sm'
              aria-pressed={granularity === 'day'}
              className={cn(
                'h-10 rounded-full px-4 text-sm transition-all',
                granularity === 'day'
                  ? 'bg-foreground text-white hover:bg-foreground'
                  : 'border-border bg-white text-foreground hover:border-info/25 hover:bg-info/10 hover:text-info',
              )}
              onClick={() => onGranularityChange('day')}
            >
              일별 보기
            </Button>
          </div>
        </section>

        <div className='grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
          <section className='rounded-2xl border border-border bg-canvas/80 p-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-sm font-semibold text-foreground'>
                  <CalendarRange className='h-4 w-4 text-info' />
                  기간
                </div>
                <p className='text-xs leading-5 text-muted-foreground'>
                  {granularity === 'day'
                    ? '아래 성장 KPI, 차트, 로케일 비교에만 적용되는 기준 날짜 범위를 선택하세요.'
                    : '아래 성장 KPI, 차트, 로케일 비교에만 적용되는 기준 월 범위를 선택하세요.'}
                </p>
              </div>
              <div className='rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted-foreground'>
                {granularity === 'day' ? '일 단위 집계' : '월 단위 집계'}
              </div>
            </div>

            <div className='mt-4 flex flex-col gap-3'>
              <div className='flex flex-wrap gap-2'>
                {presetOptions.map((option) => {
                  const active = preset === option.value;
                  return (
                    <Button
                      key={option.value}
                      type='button'
                      variant={active ? 'default' : 'outline'}
                      size='sm'
                      aria-pressed={active}
                      className={cn(
                        'h-10 rounded-full px-4 text-sm transition-all',
                        active
                          ? 'bg-info text-white hover:bg-info'
                          : 'border-border bg-white text-foreground hover:border-info/25 hover:bg-info/10 hover:text-info',
                      )}
                      onClick={() => onPresetChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>

              {granularity === 'day' ? (
                <DatePickerWithRange
                  startedAt={startedAt}
                  endedAt={endedAt}
                  setStartedAt={setStartedAt}
                  setEndedAt={setEndedAt}
                />
              ) : (
                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='space-y-1.5'>
                    <p className='text-xs font-medium text-muted-foreground'>시작 월</p>
                    <Select
                      value={startedMonthValue}
                      onValueChange={(value) => {
                        setStartedAt(dayjs(value).startOf('month'));
                      }}
                    >
                      <SelectTrigger className='h-10 w-full border-border bg-white text-sm text-foreground'>
                        <SelectValue placeholder='시작 월 선택' />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <p className='text-xs font-medium text-muted-foreground'>종료 월</p>
                    <Select
                      value={endedMonthValue}
                      onValueChange={(value) => {
                        setEndedAt(dayjs(value).endOf('month'));
                      }}
                    >
                      <SelectTrigger className='h-10 w-full border-border bg-white text-sm text-foreground'>
                        <SelectValue placeholder='종료 월 선택' />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <p className='text-xs leading-5 text-muted-foreground'>
                {granularity === 'day'
                  ? '대시보드 성장 지표는 종료일 기준 누적과 일별 증가 기준으로 집계되며, 선택한 기간 동안 얼마나 늘었는지 함께 보여줍니다.'
                  : '대시보드 성장 지표는 월말 누적과 월별 증가 기준으로 집계되며, 선택한 월 범위 동안 얼마나 늘었는지 함께 보여줍니다.'}
              </p>
            </div>
          </section>

          <section className='rounded-2xl border border-border bg-white p-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-sm font-semibold text-foreground'>
                  <Globe2 className='h-4 w-4 text-info' />
                  국가 / 로케일
                </div>
                <p className='text-xs leading-5 text-muted-foreground'>
                  비교할 시장을 좁혀서 리더보드를 빠르게 읽을 수 있습니다.
                </p>
              </div>
              <div className='rounded-full border border-info/25 bg-info/10 px-3 py-1 text-xs font-medium text-info'>
                {selectedLocales.length}개 선택
              </div>
            </div>

            <div className='mt-4 flex flex-wrap gap-2' role='group' aria-label='로케일 필터'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                aria-pressed={allSelected}
                className={cn(
                  'h-10 rounded-full border px-4 text-sm transition-all',
                  allSelected
                    ? 'border-foreground bg-foreground text-white hover:bg-foreground'
                    : 'border-border bg-white text-foreground hover:border-info/25 hover:bg-info/10 hover:text-info',
                )}
                onClick={onSelectAllLocales}
              >
                {allSelected && <Check className='h-4 w-4' />}
                전체
              </Button>

              {locales.map((locale) => {
                const active = selectedLocales.includes(locale);
                return (
                  <Button
                    key={locale}
                    type='button'
                    variant='outline'
                    size='sm'
                    aria-pressed={active}
                    className={cn(
                      'h-10 rounded-full border px-4 text-sm transition-all',
                      active
                        ? 'border-info bg-info/10 text-info hover:bg-info/10'
                        : 'border-border bg-white text-foreground hover:border-info/25 hover:bg-info/10 hover:text-info',
                    )}
                    onClick={() => onToggleLocale(locale)}
                  >
                    {active && <Check className='h-4 w-4' />}
                    {getLocaleLabel(locale)}
                  </Button>
                );
              })}
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardFilterBar;
