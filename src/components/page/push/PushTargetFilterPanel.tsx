import type { PushTargetFilter } from '@/client/push';
import type { Locale, SpaceType } from '@/client/types';
import { LOCALE_DISPLAY_NAME, LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const SPACE_TYPE_OPTIONS: { value: SpaceType; label: string }[] = [
  { value: 'alone', label: '혼자' },
  { value: 'couple', label: '커플' },
  { value: 'family', label: '가족' },
  { value: 'friends', label: '친구' },
];

/** Multi-select chip. Same ink inversion as every other selected state in the admin. */
function ToggleChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'flex h-9 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        on
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

/** Empty means "not set". Number('') is 0, which would read as a real "0개 이상". */
export function parseThreshold(raw: string): number | undefined {
  return raw.trim() === '' ? undefined : Number(raw);
}

export function isEmptyPushFilter(filter: PushTargetFilter): boolean {
  return (
    !filter.spaceTypes?.length &&
    !filter.spaceLocales?.length &&
    filter.minCardCount == null &&
    filter.minPetLevel == null
  );
}

/**
 * Conditions on the space a recipient belongs to.
 *
 * The server resolves these when the campaign is saved and writes the resulting people into
 * as many push rows as they need. What the operator picks here decides an audience once, at
 * save time — it is not a rule that keeps re-evaluating afterwards.
 */
export default function PushTargetFilterPanel({
  value,
  onChange,
  disabled,
}: {
  value: PushTargetFilter;
  onChange: (next: PushTargetFilter) => void;
  disabled?: boolean;
}) {
  const toggle = <T,>(key: 'spaceTypes' | 'spaceLocales', list: T[] | undefined, item: T) => {
    const current = (list ?? []) as T[];
    const next = current.includes(item) ? current.filter((v) => v !== item) : [...current, item];
    onChange({ ...value, [key]: next.length ? next : undefined });
  };

  return (
    <div>
      <DefinitionRow
        label='공간 유형'
        hint='선택한 유형 중 하나라도 해당하면 포함됩니다. 비우면 유형을 가리지 않습니다'
      >
        <div className='flex flex-wrap gap-2'>
          {SPACE_TYPE_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt.value}
              on={(value.spaceTypes ?? []).includes(opt.value)}
              onClick={() => !disabled && toggle('spaceTypes', value.spaceTypes, opt.value)}
            >
              {opt.label}
            </ToggleChip>
          ))}
        </div>
      </DefinitionRow>

      <DefinitionRow label='공간 언어' hint='공간의 언어입니다. 위 언어 항목은 계정의 앱 언어라 서로 다릅니다'>
        <div className='flex flex-wrap gap-2'>
          {LOCALE_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt.value}
              on={(value.spaceLocales ?? []).includes(opt.value as Locale)}
              onClick={() => !disabled && toggle('spaceLocales', value.spaceLocales, opt.value as Locale)}
            >
              {LOCALE_DISPLAY_NAME[opt.value] ?? opt.label}
            </ToggleChip>
          ))}
        </div>
      </DefinitionRow>

      <DefinitionRow label='질문 개수' hint='이 개수 이상 발급된 공간'>
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            min={0}
            inputMode='numeric'
            className='w-[120px]'
            placeholder='예: 10'
            disabled={disabled}
            value={value.minCardCount ?? ''}
            onChange={(e) => onChange({ ...value, minCardCount: parseThreshold(e.target.value) })}
          />
          <span className='text-sm text-muted-foreground'>개 이상</span>
        </div>
      </DefinitionRow>

      <DefinitionRow label='펫 레벨' hint='이 레벨 이상인 펫이 있는 공간'>
        <div className='flex items-center gap-2'>
          <Input
            type='number'
            min={1}
            inputMode='numeric'
            className='w-[120px]'
            placeholder='예: 5'
            disabled={disabled}
            value={value.minPetLevel ?? ''}
            onChange={(e) => onChange({ ...value, minPetLevel: parseThreshold(e.target.value) })}
          />
          <span className='text-sm text-muted-foreground'>레벨 이상</span>
        </div>
      </DefinitionRow>

      {!isEmptyPushFilter(value) && (
        <DefinitionRow label='조건 해제' hint='조건을 모두 비우면 해당 언어의 전체 사용자에게 발송됩니다'>
          <Button type='button' variant='outline' size='sm' disabled={disabled} onClick={() => onChange({})}>
            조건 모두 지우기
          </Button>
        </DefinitionRow>
      )}
    </div>
  );
}
