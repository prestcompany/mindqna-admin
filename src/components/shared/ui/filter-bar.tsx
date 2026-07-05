import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export const FILTER_CONTROL_CLASS = 'h-8 text-sm';

export interface FilterChipItem {
  key: string;
  label: string;
}

export function FilterChips({ chips, onRemove }: { chips: FilterChipItem[]; onRemove: (key: string) => void }) {
  if (!chips.length) return null;
  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-2.5 pr-1 text-xs font-medium text-slate-600'
        >
          {chip.label}
          <button
            type='button'
            aria-label={`${chip.label} 필터 제거`}
            onClick={() => onRemove(chip.key)}
            className='-my-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors duration-fast hover:bg-slate-100 hover:text-slate-700'
          >
            <X className='h-3 w-3' />
          </button>
        </span>
      ))}
    </div>
  );
}

interface FilterBarProps {
  children: ReactNode;
  chips?: FilterChipItem[];
  onRemoveChip?: (key: string) => void;
  className?: string;
}

export function FilterBar({ children, chips, onRemoveChip, className }: FilterBarProps) {
  return (
    <div className='space-y-2 py-3'>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
      {chips && chips.length > 0 && onRemoveChip ? <FilterChips chips={chips} onRemove={onRemoveChip} /> : null}
    </div>
  );
}
