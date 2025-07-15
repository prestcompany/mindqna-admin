import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import * as React from 'react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from '@/components/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  startedAt: dayjs.Dayjs | null;
  endedAt: dayjs.Dayjs | null;
  setStartedAt: (date: dayjs.Dayjs | null) => void;
  setEndedAt: (date: dayjs.Dayjs | null) => void;
  onDateChange?: () => void;
}

export function DatePickerWithRange({
  className,
  startedAt,
  endedAt,
  setStartedAt,
  setEndedAt,
  onDateChange,
}: DatePickerWithRangeProps) {
  // 기존 date 상태는 실제 반영된 날짜, pendingDate는 사용자가 선택 중인 날짜
  const [date, setDate] = React.useState<DateRange | undefined>(
    startedAt && endedAt ? {
      from: startedAt.toDate(),
      to: endedAt.toDate(),
    } : undefined
  );
  const [pendingDate, setPendingDate] = React.useState<DateRange | undefined>(
    startedAt && endedAt ? {
      from: startedAt.toDate(),
      to: endedAt.toDate(),
    } : undefined
  );
  // Popover open 상태 관리
  const [open, setOpen] = React.useState(false);

  // 달력 표시 월 상태 관리
  const [currentMonth, setCurrentMonth] = React.useState<Date>(
    (startedAt && startedAt.toDate()) || new Date()
  );

  // 년도 배열 생성 (현재 년도부터 5년 전까지)
  const years = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  // 월 배열 생성
  const months = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i);
  }, []);

  // 날짜 범위가 변경될 때 (달력에서 선택 시)
  const handlePendingDateChange = (range: DateRange | undefined) => {
    setPendingDate(range);
  };

  // '확인' 버튼 클릭 시 실제 날짜 반영
  const handleConfirm = () => {
    if (pendingDate?.from && pendingDate?.to) {
      setStartedAt(dayjs(pendingDate.from));
      setEndedAt(dayjs(pendingDate.to));
      setDate(pendingDate);
      if (onDateChange) {
        onDateChange();
      }
    } else {
      // 날짜가 완전히 선택되지 않았으면 null로 설정
      setStartedAt(null);
      setEndedAt(null);
      setDate(undefined);
    }
    setOpen(false); // 확인 시 팝오버 닫기
  };

  // Dayjs 날짜가 변경되면 내부 상태도 업데이트
  React.useEffect(() => {
    if (startedAt && endedAt) {
      setDate({
        from: startedAt.toDate(),
        to: endedAt.toDate(),
      });
      setPendingDate({
        from: startedAt.toDate(),
        to: endedAt.toDate(),
      });
    } else {
      setDate(undefined);
      setPendingDate(undefined);
    }
  }, [startedAt, endedAt]);

  // 년도 변경 처리
  const handleYearChange = (year: string) => {
    const newDate = new Date(currentMonth);
    newDate.setFullYear(parseInt(year));
    setCurrentMonth(newDate);
  };

  // 월 변경 처리
  const handleMonthChange = (month: string) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(parseInt(month));
    setCurrentMonth(newDate);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id='date'
            variant={'outline'}
            className={cn('w-auto justify-start text-left font-normal', !date && 'text-muted-foreground')}
          >
            <CalendarIcon className='w-4 h-4 mr-2' />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'yyyy-MM-dd')} ~ {format(date.to, 'yyyy-MM-dd')}
                </>
              ) : (
                format(date.from, 'yyyy-MM-dd')
              )
            ) : (
              <span>날짜 선택</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <div className='flex items-center p-3 space-x-2 border-b'>
            <Select onValueChange={handleYearChange} value={currentMonth.getFullYear().toString()}>
              <SelectTrigger className='w-[100px]'>
                <SelectValue placeholder={currentMonth.getFullYear().toString()} />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select onValueChange={handleMonthChange} value={currentMonth.getMonth().toString()}>
              <SelectTrigger className='w-[100px]'>
                <SelectValue placeholder={(currentMonth.getMonth() + 1).toString()} />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month + 1}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            initialFocus
            mode='range'
            defaultMonth={pendingDate?.from}
            selected={pendingDate}
            onSelect={handlePendingDateChange}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            numberOfMonths={2}
            locale={ko}
          />
          <div className='flex justify-end p-3 border-t'>
            <Button onClick={handleConfirm} disabled={!pendingDate?.from || !pendingDate?.to}>
              확인
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
