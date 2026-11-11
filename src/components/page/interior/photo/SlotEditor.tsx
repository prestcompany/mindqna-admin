import type { PhotoSlot } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { commitSlotNumber, moveSlot, newSlot, resizeSlot, slotProblems, type SlotNumberField } from './slot-rules';
import type { PhotoDraft } from './usePhotoDraft';

type Corner = 'nw' | 'ne' | 'sw' | 'se';
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
const MAX_SLOTS = 10;

// 손잡이는 24px 누르는 자리 가운데에 12px 점을 그린다(DESIGN.md 최소 누름 크기).
const CORNER_POSITION: Record<Corner, string> = {
  nw: '-left-3 -top-3 cursor-nwse-resize',
  ne: '-right-3 -top-3 cursor-nesw-resize',
  sw: '-bottom-3 -left-3 cursor-nesw-resize',
  se: '-bottom-3 -right-3 cursor-nwse-resize',
};

type NumberField = { key: SlotNumberField; label: string };
const NUMBER_FIELDS: NumberField[] = [
  { key: 'x', label: 'x' },
  { key: 'y', label: 'y' },
  { key: 'width', label: '너비' },
  { key: 'height', label: '높이' },
  { key: 'rotation', label: '기울기(도)' },
  { key: 'radius', label: '모서리' },
];

/**
 * 쓰는 동안은 글 그대로 두고, 칸을 떠나거나 Enter 를 누르면 범위로 잘라 확정한다.
 * 바로 반영하면 '-'·'0.' 같은 쓰는 중의 글이 되돌려지거나 0 이 들어간다.
 * type=number 를 쓰지 않는다. SVG 에서 읽은 소수 5자리 값이 step 에 맞지 않아 브라우저가 폼 저장을 막는다.
 */
function SlotNumberInput({
  id,
  field,
  value,
  onCommit,
}: {
  id: string;
  field: SlotNumberField;
  value: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text === null) return;
    const n = commitSlotNumber(field, text);
    if (n !== null) onCommit(n);
    setText(null);
  };
  return (
    <Input
      id={id}
      type='text'
      inputMode='decimal'
      className='tabular-nums'
      value={text ?? String(value)}
      onFocus={() => setText(String(value))}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

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
              // 끌기는 마우스 전용이다. 키보드는 아래 칸 버튼과 숫자 칸으로 고친다.
              aria-hidden='true'
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
                      className={cn('absolute flex h-6 w-6 items-center justify-center', CORNER_POSITION[corner])}
                      // 움직임·놓기는 칸 상자로 올라가 거기서 한 번만 처리한다.
                      onPointerDown={(e) => begin(e, slot, corner)}
                    >
                      <span className='h-3 w-3 rounded-sm border border-primary bg-background' />
                    </span>
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
              return (
                <div key={f.key} className='space-y-1.5'>
                  <Label htmlFor={id} className='text-xs text-muted-foreground'>
                    {f.label}
                  </Label>
                  <SlotNumberInput
                    key={`${selected.key}-${f.key}`}
                    id={id}
                    field={f.key}
                    value={selected[f.key] ?? 0}
                    onCommit={(n) => replace({ ...selected, [f.key]: n })}
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
