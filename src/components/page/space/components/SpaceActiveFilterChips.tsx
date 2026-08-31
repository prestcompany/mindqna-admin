import { SearchSpacesParams } from '@/client/space';
import { FilterChips } from '@/components/shared/ui/filter-bar';

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
    <FilterChips
      chips={chips.map((chip) => ({ key: chip.key, label: chip.label }))}
      onRemove={(key) => onRemove(key as ActiveChip['key'])}
    />
  );
}

export default SpaceActiveFilterChips;
