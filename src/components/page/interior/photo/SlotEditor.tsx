import type { PhotoSlot } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { moveSlot, newSlot, resizeSlot, slotProblems } from './slot-rules';
import type { PhotoDraft } from './usePhotoDraft';

type Corner = 'nw' | 'ne' | 'sw' | 'se';
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
const MAX_SLOTS = 10;

const CORNER_POSITION: Record<Corner, string> = {
  nw: '-left-1.5 -top-1.5 cursor-nwse-resize',
  ne: '-right-1.5 -top-1.5 cursor-nesw-resize',
  sw: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
  se: '-bottom-1.5 -right-1.5 cursor-nwse-resize',
};

type NumberField = { key: keyof PhotoSlot; label: string; min: number; max: number; step: number };
const NUMBER_FIELDS: NumberField[] = [
  { key: 'x', label: 'x', min: 0, max: 1, step: 0.001 },
  { key: 'y', label: 'y', min: 0, max: 1, step: 0.001 },
  { key: 'width', label: '너비', min: 0, max: 1, step: 0.001 },
  { key: 'height', label: '높이', min: 0, max: 1, step: 0.001 },
  { key: 'rotation', label: '기울기(도)', min: -45, max: 45, step: 1 },
  { key: 'radius', label: '모서리', min: 0, max: 0.5, step: 0.01 },
];

type SlotEditorProps = { draft: PhotoDraft };

/**
 * 바닥 그림 위에서 칸을 더하고, 끌어 옮기고, 모서리로 크기를 바꾼다.
 * 끌기와 손잡이는 돌리기 전 네모(서버가 범위를 재는 네모)에 둔다. 돌린 모양은 채움으로만 보인다.
 */
function SlotEditor({ draft }: SlotEditorProps) {
  const { base, imgWidth, imgHeight, slots, setSlots, selectedKey, setSelectedKey, savedKeys, purchasedCount } = draft;
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ key: string; corner: Corner | null; startX: number; startY: number; start: PhotoSlot } | null>(
    null,
  );

  const ready = Boolean(base?.uri) && imgWidth > 0;
  const selected = slots.find((s) => s.key === selectedKey) ?? null;
  const problems = slots.length ? slotProblems(slots) : [];

  const replace = (next: PhotoSlot) => setSlots(slots.map((s) => (s.key === next.key ? next : s)));

  const begin = (e: ReactPointerEvent, slot: PhotoSlot, corner: Corner | null) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedKey(slot.key);
    drag.current = { key: slot.key, corner, startX: e.clientX, startY: e.clientY, start: slot };
  };

  const move = (e: ReactPointerEvent) => {
    const d = drag.current;
    const rect = surface.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const dx = (e.clientX - d.startX) / rect.width;
    const dy = (e.clientY - d.startY) / rect.height;
    replace(d.corner ? resizeSlot(d.start, d.corner, dx, dy) : moveSlot(d.start, dx, dy));
  };

  const end = () => {
    drag.current = null;
  };

  const add = () => {
    const slot = newSlot(slots);
    setSlots([...slots, slot]);
    setSelectedKey(slot.key);
  };

  const remove = (key: string) => {
    const next = slots.filter((s) => s.key !== key);
    setSlots(next);
    setSelectedKey(next[0]?.key ?? null);
  };

  const locked = (key: string) => purchasedCount > 0 && savedKeys.includes(key);

  if (!ready) {
    return <p className='text-sm text-muted-foreground'>바닥 그림을 고르면 칸을 편집할 수 있습니다.</p>;
  }

  return (
    <div className='space-y-3'>
      <div
        ref={surface}
        className='relative w-full max-w-[480px] touch-none select-none overflow-visible rounded-md border border-border bg-canvas'
        style={{ aspectRatio: `${imgWidth} / ${imgHeight}` }}
      >
        <img src={base?.uri ?? ''} alt='바닥 그림' className='absolute inset-0 h-full w-full' draggable={false} />
        {slots.map((slot) => {
          const active = slot.key === selectedKey;
          return (
            <div
              key={slot.key}
              role='button'
              aria-label={`칸 ${slot.key}`}
              aria-pressed={active}
              className={cn(
                'absolute cursor-move border',
                active ? 'z-10 border-primary' : 'border-dashed border-foreground/60',
              )}
              style={{
                left: `${slot.x * 100}%`,
                top: `${slot.y * 100}%`,
                width: `${slot.width * 100}%`,
                height: `${slot.height * 100}%`,
              }}
              onPointerDown={(e) => begin(e, slot, null)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            >
              <div
                aria-hidden='true'
                className='pointer-events-none absolute inset-0 bg-primary/20'
                style={{
                  transform: `rotate(${slot.rotation ?? 0}deg)`,
                  borderRadius: `${(slot.radius ?? 0) * 100}% / ${((slot.radius ?? 0) * slot.width * imgWidth * 100) / (slot.height * imgHeight)}%`,
                }}
              />
              <span className='pointer-events-none absolute left-1 top-0.5 text-xs font-semibold text-foreground'>
                {slot.key}
              </span>
              {active
                ? CORNERS.map((corner) => (
                    <span
                      key={corner}
                      aria-hidden='true'
                      className={cn(
                        'absolute h-3 w-3 rounded-sm border border-primary bg-background',
                        CORNER_POSITION[corner],
                      )}
                      onPointerDown={(e) => begin(e, slot, corner)}
                      onPointerMove={move}
                      onPointerUp={end}
                      onPointerCancel={end}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        {slots.map((slot) => (
          <Button
            key={slot.key}
            type='button'
            size='sm'
            variant={slot.key === selectedKey ? 'default' : 'outline'}
            onClick={() => setSelectedKey(slot.key)}
            aria-pressed={slot.key === selectedKey}
          >
            칸 {slot.key}
          </Button>
        ))}
        <Button type='button' size='sm' variant='ghost' onClick={add} disabled={slots.length >= MAX_SLOTS}>
          <Plus className='h-4 w-4' aria-hidden='true' />칸 추가
        </Button>
      </div>

      {selected ? (
        <div className='space-y-3 rounded-lg border border-border bg-card p-4'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {NUMBER_FIELDS.map((f) => {
              const id = `slot-${selected.key}-${f.key}`;
              const value = selected[f.key] ?? 0;
              return (
                <div key={f.key} className='space-y-1.5'>
                  <Label htmlFor={id} className='text-xs text-muted-foreground'>
                    {f.label}
                  </Label>
                  <Input
                    id={id}
                    type='number'
                    inputMode='decimal'
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    className='tabular-nums'
                    value={value}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (e.target.value !== '' && Number.isFinite(n)) replace({ ...selected, [f.key]: n });
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => remove(selected.key)}
              disabled={locked(selected.key)}
            >
              <Trash2 className='h-4 w-4' aria-hidden='true' />칸 {selected.key} 삭제
            </Button>
            {locked(selected.key) ? (
              <p className='text-xs text-muted-foreground'>
                산 공간 {purchasedCount}곳의 사진이 끊깁니다. 저장된 칸은 지울 수 없습니다.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {problems.length ? (
        <ul role='status' className='space-y-0.5 text-sm text-destructive'>
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default SlotEditor;
