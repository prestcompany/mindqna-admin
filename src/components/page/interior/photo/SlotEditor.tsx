import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { BOARD_MAX_SLOTS, boardSlotProblems } from './board-rules';
import BoardTextFields from './BoardTextFields';
import { commitSlotNumber, moveSlot, resizeSlot, slotProblems, type SlotNumberField } from './slot-rules';
import SlotNumberInput from './SlotNumberInput';
import type { DraftSlot, PhotoDraft } from './usePhotoDraft';

type Corner = 'nw' | 'ne' | 'sw' | 'se';
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];
const PHOTO_MAX_SLOTS = 10;

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

type SlotEditorProps = { draft: PhotoDraft };

/**
 * 바닥 그림 위에서 칸을 더하고, 끌어 옮기고, 모서리로 크기를 바꾼다.
 * 끌기와 손잡이는 돌리기 전 네모(서버가 범위를 재는 네모)에 둔다. 돌린 모양은 채움으로만 보인다.
 */
function SlotEditor({ draft }: SlotEditorProps) {
  const { kind, base, imgWidth, imgHeight, slots, setSlots, selectedKey, setSelectedKey, savedKeys, purchasedCount } =
    draft;
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ key: string; corner: Corner | null; startX: number; startY: number; start: DraftSlot } | null>(
    null,
  );

  const isBoard = kind === 'board';
  const maxSlots = isBoard ? BOARD_MAX_SLOTS : PHOTO_MAX_SLOTS;
  const ready = Boolean(base?.uri) && imgWidth > 0;
  const selected = slots.find((s) => s.key === selectedKey) ?? null;
  const selectedBoard = isBoard ? (draft.boardSlots.find((s) => s.key === selectedKey) ?? null) : null;
  const problems = slots.length ? (isBoard ? boardSlotProblems(draft.boardSlots, imgHeight) : slotProblems(slots)) : [];
  // 칠판 칸은 모서리가 없다.
  const numberFields = isBoard ? NUMBER_FIELDS.filter((f) => f.key !== 'radius') : NUMBER_FIELDS;

  const replace = draft.updateSlot;

  const begin = (e: ReactPointerEvent, slot: DraftSlot, corner: Corner | null) => {
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
    const cur = slots.find((s) => s.key === d.key);
    if (!cur) return;
    // 자리만 끌기 시작 칸에서 다시 재고 나머지는 지금 칸 값을 둔다. 끌기 시작 때의 글자 크기를 되살리면 칸 높이를 따라가던 크기가 풀린다.
    const { x, y, width, height } = d.corner ? resizeSlot(d.start, d.corner, dx, dy) : moveSlot(d.start, dx, dy);
    replace({ ...cur, x, y, width, height });
  };

  const end = () => {
    drag.current = null;
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
        <Button type='button' size='sm' variant='ghost' onClick={draft.addSlot} disabled={slots.length >= maxSlots}>
          <Plus className='h-4 w-4' aria-hidden='true' />칸 추가
        </Button>
      </div>

      {selected ? (
        <div className='space-y-3 rounded-lg border border-border bg-card p-4'>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
            {numberFields.map((f) => {
              const id = `slot-${selected.key}-${f.key}`;
              return (
                <div key={f.key} className='space-y-1.5'>
                  <Label htmlFor={id} className='text-xs text-muted-foreground'>
                    {f.label}
                  </Label>
                  <SlotNumberInput
                    key={`${selected.key}-${f.key}`}
                    id={id}
                    parse={(text) => commitSlotNumber(f.key, text)}
                    value={selected[f.key] ?? 0}
                    onCommit={(n) => replace({ ...selected, [f.key]: n })}
                  />
                </div>
              );
            })}
          </div>
          {selectedBoard ? <BoardTextFields slot={selectedBoard} imgHeight={imgHeight} onChange={replace} /> : null}
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
                산 공간 {purchasedCount}곳의 {isBoard ? '글이' : '사진이'} 끊깁니다. 저장된 칸은 지울 수 없습니다.
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
