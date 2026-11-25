import type { BoardSlot } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { type BoardNumberField, commitBoardNumber } from './board-rules';
import SlotNumberInput from './SlotNumberInput';

const COLOR = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const NUMBER_FIELDS: { key: BoardNumberField; label: string }[] = [
  { key: 'fontSize', label: '글자 크기(px)' },
  { key: 'maxLength', label: '최대 글자 수' },
  { key: 'maxLines', label: '최대 줄 수' },
];

const ALIGNS: { value: 'center' | 'left'; label: string }[] = [
  { value: 'center', label: '가운데' },
  { value: 'left', label: '왼쪽' },
];

/** 글자색: 색 고르기(#RRGGBB) + 글 입력(#RRGGBBAA 도). 고르기로 바꾸면 투명도 두 자리는 그대로 둔다. */
function ColorField({ id, value, onCommit }: { id: string; value: string; onCommit: (c: string) => void }) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text !== null && COLOR.test(text.trim())) onCommit(text.trim().toUpperCase());
    setText(null);
  };
  return (
    <div className='flex items-center gap-2'>
      <input
        type='color'
        aria-label='글자색 고르기'
        className='h-9 w-10 shrink-0 cursor-pointer rounded-md border border-border bg-background p-1'
        value={value.slice(0, 7)}
        onChange={(e) => onCommit(e.target.value.toUpperCase() + value.slice(7))}
      />
      <Input
        id={id}
        type='text'
        className='font-mono'
        value={text ?? value}
        onFocus={() => setText(value)}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
    </div>
  );
}

type BoardTextFieldsProps = {
  slot: BoardSlot;
  imgHeight: number;
  onChange: (next: BoardSlot) => void;
};

/** 칠판 칸 하나의 글 속성. */
function BoardTextFields({ slot, imgHeight, onChange }: BoardTextFieldsProps) {
  const heightPx = slot.height * imgHeight;
  const align = slot.align ?? 'center';
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
      <div className='space-y-1.5'>
        <Label htmlFor={`slot-${slot.key}-color`} className='text-xs text-muted-foreground'>
          글자색
        </Label>
        <ColorField
          key={`${slot.key}-color`}
          id={`slot-${slot.key}-color`}
          value={slot.color}
          onCommit={(color) => onChange({ ...slot, color })}
        />
      </div>
      {NUMBER_FIELDS.map((f) => {
        const id = `slot-${slot.key}-${f.key}`;
        return (
          <div key={f.key} className='space-y-1.5'>
            <Label htmlFor={id} className='text-xs text-muted-foreground'>
              {f.label}
            </Label>
            <SlotNumberInput
              key={`${slot.key}-${f.key}`}
              id={id}
              value={slot[f.key]}
              parse={(text) => commitBoardNumber(f.key, text, heightPx)}
              onCommit={(n) => onChange({ ...slot, [f.key]: n })}
            />
          </div>
        );
      })}
      <div className='space-y-1.5'>
        <span id={`slot-${slot.key}-align`} className='text-xs text-muted-foreground'>
          정렬
        </span>
        <div className='flex gap-2' role='group' aria-labelledby={`slot-${slot.key}-align`}>
          {ALIGNS.map((a) => (
            <Button
              key={a.value}
              type='button'
              size='sm'
              variant={align === a.value ? 'default' : 'outline'}
              aria-pressed={align === a.value}
              onClick={() => onChange({ ...slot, align: a.value })}
            >
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BoardTextFields;
