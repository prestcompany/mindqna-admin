import { SearchSpacesParams } from '@/client/space';
import { X } from 'lucide-react';

interface ActiveChip {
  key: 'type' | 'locale' | 'date';
  label: string;
}

interface SpaceActiveFilterChipsProps {
  params: SearchSpacesParams | null;
  onRemove: (key: ActiveChip['key']) => void;
}

const TYPE_LABEL: Record<string, string> = { alone: '혼자', couple: '커플', family: '가족', friends: '친구' };

function buildChips(params: SearchSpacesParams | null): ActiveChip[] {
  if (!params) return [];
  const chips: ActiveChip[] = [];
  if (params.type) chips.push({ key: 'type', label: `타입: ${TYPE_LABEL[params.type] ?? params.type}` });
  if (params.locale) chips.push({ key: 'locale', label: `언어: ${params.locale.toUpperCase()}` });
  if (params.startDate || params.endDate) {
    chips.push({ key: 'date', label: `기간: ${params.startDate ?? '~'} ~ ${params.endDate ?? '~'}` });
  }
  return chips;
}

function SpaceActiveFilterChips({ params, onRemove }: SpaceActiveFilterChipsProps) {
  const chips = buildChips(params);
  if (!chips.length) return null;

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-3 pr-1.5 text-xs font-medium text-slate-600'
        >
          {chip.label}
          <button
            type='button'
            aria-label={`${chip.label} 필터 제거`}
            onClick={() => onRemove(chip.key)}
            className='inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700'
          >
            <X className='h-3 w-3' />
          </button>
        </span>
      ))}
    </div>
  );
}

export default SpaceActiveFilterChips;
