import { searchPushTargets, type PushTargetFilter } from '@/client/push';
import type { Locale, SpaceType } from '@/client/types';
import { LOCALE_DISPLAY_NAME, LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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

/**
 * Turns space-level conditions into the concrete username list the per-user send path takes.
 *
 * It deliberately does NOT introduce a third kind of target. The filter runs, the operator
 * sees who matched, and the names land in the same 개인 발송 field a hand-typed send uses —
 * so everything downstream (validation, the confirm dialog, the sender, cancel rules)
 * behaves exactly as it already does.
 */
export default function PushTargetFilterPanel({ onApply }: { onApply: (userNames: string[]) => void }) {
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [spaceLocales, setSpaceLocales] = useState<Locale[]>([]);
  const [minCardCount, setMinCardCount] = useState('');
  const [minPetLevel, setMinPetLevel] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<{ count: number; names: string[]; limit: number; truncated: boolean } | null>(
    null,
  );

  const toggle = <T,>(list: T[], value: T, set: (next: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  // Parsed once so the empty check and the request agree on what counts as "set".
  // Number('') is 0, which would read as a real "0개 이상" filter and match everyone.
  const cards = minCardCount.trim() === '' ? undefined : Number(minCardCount);
  const level = minPetLevel.trim() === '' ? undefined : Number(minPetLevel);
  const isEmpty = !spaceTypes.length && !spaceLocales.length && cards == null && level == null;

  const filter: PushTargetFilter = {
    ...(spaceTypes.length ? { spaceTypes } : {}),
    ...(spaceLocales.length ? { spaceLocales } : {}),
    ...(cards == null ? {} : { minCardCount: cards }),
    ...(level == null ? {} : { minPetLevel: level }),
  };

  const search = async () => {
    setSearching(true);
    try {
      const res = await searchPushTargets(filter);
      setResult({ count: res.count, names: res.userNames, limit: res.limit, truncated: res.truncated });
      if (res.count === 0) toast.info('조건에 맞는 사용자가 없습니다');
    } catch (err) {
      toast.error(`대상 조회 실패: ${err}`);
    } finally {
      setSearching(false);
    }
  };

  const reset = () => {
    setSpaceTypes([]);
    setSpaceLocales([]);
    setMinCardCount('');
    setMinPetLevel('');
    setResult(null);
  };

  return (
    <div>
      <DefinitionRow label='공간 유형' hint='선택한 유형 중 하나라도 해당하면 포함됩니다'>
        <div className='flex flex-wrap gap-2'>
          {SPACE_TYPE_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt.value}
              on={spaceTypes.includes(opt.value)}
              onClick={() => toggle(spaceTypes, opt.value, setSpaceTypes)}
            >
              {opt.label}
            </ToggleChip>
          ))}
        </div>
      </DefinitionRow>

      <DefinitionRow label='공간 언어' hint='공간의 언어입니다. 위 언어 항목(계정의 앱 언어)과 다릅니다'>
        <div className='flex flex-wrap gap-2'>
          {LOCALE_OPTIONS.map((opt) => (
            <ToggleChip
              key={opt.value}
              on={spaceLocales.includes(opt.value)}
              onClick={() => toggle(spaceLocales, opt.value, setSpaceLocales)}
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
            value={minCardCount}
            onChange={(e) => setMinCardCount(e.target.value)}
          />
          <Label className='text-sm text-muted-foreground'>개 이상</Label>
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
            value={minPetLevel}
            onChange={(e) => setMinPetLevel(e.target.value)}
          />
          <Label className='text-sm text-muted-foreground'>레벨 이상</Label>
        </div>
      </DefinitionRow>

      <DefinitionRow
        label='대상 조회'
        hint={
          isEmpty
            ? '조건을 하나 이상 선택해야 조회할 수 있습니다'
            : '모든 조건을 동시에 만족하는 공간을 가진 사용자를 찾습니다'
        }
      >
        <div className='flex flex-wrap items-center gap-2'>
          <Button type='button' variant='outline' onClick={search} disabled={isEmpty || searching}>
            {searching && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            대상 조회
          </Button>
          {result && (
            <Button type='button' onClick={() => onApply(result.names)} disabled={result.names.length === 0}>
              {result.names.length.toLocaleString()}명 대상에 넣기
            </Button>
          )}
          <Button type='button' variant='ghost' onClick={reset} disabled={searching}>
            초기화
          </Button>
        </div>

        {result && (
          <div className='mt-2 space-y-1 text-xs'>
            <p className='text-muted-foreground'>
              조건에 맞는 사용자{' '}
              <strong className='tabular-nums text-foreground'>{result.count.toLocaleString()}</strong>명
            </p>
            {/* Truncation is stated rather than implied: a filter that matched 4,120 people
                and a send that reaches 1,000 are different facts, and the operator has to
                see both before they decide the campaign is covered. */}
            {result.truncated && (
              <p className='rounded-md border border-warning/35 bg-warning/15 p-2 text-warning-foreground'>
                한 번에 보낼 수 있는 최대 인원은 {result.limit.toLocaleString()}명입니다. 조건에 맞는{' '}
                {result.count.toLocaleString()}명 중 앞의 {result.names.length.toLocaleString()}
                명만 담깁니다 — 조건을 좁히거나 나눠 보내세요.
              </p>
            )}
          </div>
        )}
      </DefinitionRow>
    </div>
  );
}
