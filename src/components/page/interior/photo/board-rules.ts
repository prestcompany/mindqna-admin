import type { BoardSlot, BoardText, PhotoSlot } from '@/client/types';
import { newSlot, slotProblems } from './slot-rules';

export const BOARD_MAX_SLOTS = 4;
/** 앱의 줄 높이 = 글자 크기 × 1.25. */
export const LINE_HEIGHT = 1.25;
const COLOR = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const DEFAULT_TEXT = { color: '#FFFFFF', maxLength: 20, maxLines: 3, align: 'center' } as const;

const floor2 = (n: number) => Math.floor(n * 100 + 1e-9) / 100;
const isIntIn = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;

/** 칸 높이 px ÷ (최대 줄 × 1.25). 이 크기면 최대 줄이 칸에 꽉 맞는다. 칸을 넘지 않게 2자리로 내린다. */
export function defaultFontSize(slot: { height: number; maxLines: number }, imgHeight: number): number {
  return floor2((slot.height * imgHeight) / (slot.maxLines * LINE_HEIGHT));
}

/** 사진 칸이나 글 속성이 빠진 칸을 칠판 칸으로 맞춘다. 모서리는 버리고, 없는 글 속성은 기본값으로 채운다. */
export function asBoardSlot(slot: PhotoSlot & Partial<BoardText>, imgHeight: number): BoardSlot {
  const { radius: _radius, ...rest } = slot;
  const maxLines = slot.maxLines ?? DEFAULT_TEXT.maxLines;
  return {
    ...rest,
    color: slot.color ?? DEFAULT_TEXT.color,
    fontSize: slot.fontSize ?? defaultFontSize({ height: slot.height, maxLines }, imgHeight),
    maxLength: slot.maxLength ?? DEFAULT_TEXT.maxLength,
    maxLines,
    align: slot.align ?? DEFAULT_TEXT.align,
  };
}

export function newBoardSlot(slots: PhotoSlot[], imgHeight: number): BoardSlot {
  return asBoardSlot(newSlot(slots), imgHeight);
}

/**
 * 글자 크기가 기본값이었으면 칸 높이·최대 줄이 바뀔 때 새 기본값을 따라간다. 손으로 쓴 크기는 그대로 둔다.
 * 칸을 더한 뒤 끌어서 크기를 맞추는 동안 글자 크기를 다시 쓰지 않아도 된다.
 */
export function followFontSize<T extends BoardSlot>(prev: T, next: T, imgHeight: number): T {
  if (prev.height === next.height && prev.maxLines === next.maxLines) return next;
  if (prev.fontSize !== defaultFontSize(prev, imgHeight)) return next;
  return { ...next, fontSize: defaultFontSize(next, imgHeight) };
}

/** 서버 checkBoardConfig 의 칸 규칙. 자리 규칙은 사진 칸과 같다. */
export function boardSlotProblems(slots: BoardSlot[], imgHeight: number): string[] {
  const problems = slotProblems(slots, BOARD_MAX_SLOTS);
  for (const s of slots) {
    const at = `칸 ${s.key || '(빈 키)'}`;
    const heightPx = s.height * imgHeight;
    if (!COLOR.test(s.color)) problems.push(`${at}: 글자색은 #RRGGBB 또는 #RRGGBBAA 여야 합니다`);
    if (!(s.fontSize > 0) || !(s.fontSize <= heightPx))
      problems.push(`${at}: 글자 크기는 0 보다 크고 칸 높이(${floor2(heightPx)}px) 이하여야 합니다`);
    if (!isIntIn(s.maxLength, 1, 100)) problems.push(`${at}: 최대 글자 수는 1–100 정수여야 합니다`);
    if (!isIntIn(s.maxLines, 1, 10)) problems.push(`${at}: 최대 줄 수는 1–10 정수여야 합니다`);
    if (s.align !== undefined && s.align !== 'left' && s.align !== 'center')
      problems.push(`${at}: 정렬은 가운데 또는 왼쪽이어야 합니다`);
  }
  return problems;
}

export type BoardNumberField = 'fontSize' | 'maxLength' | 'maxLines';

/** 숫자 칸에 쓴 글을 확정한다. 숫자가 아니면 null. 글자 수·줄 수는 정수로, 글자 크기는 칸 높이 px 까지 2자리로. */
export function commitBoardNumber(field: BoardNumberField, raw: string, slotHeightPx: number): number | null {
  const text = raw.trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  if (field === 'maxLength') return Math.min(Math.max(Math.round(n), 1), 100);
  if (field === 'maxLines') return Math.min(Math.max(Math.round(n), 1), 10);
  return Math.min(Math.max(Math.round(n * 100) / 100, 0.01), floor2(slotHeightPx));
}

/** 칸 SVG 를 다시 불러올 때: 있던 키는 글 속성을 두고 자리만 바꾸고, 새 키는 기본값으로 채운다. */
export function mergeImportedSlots(
  prev: (PhotoSlot & Partial<BoardText>)[],
  imported: PhotoSlot[],
  imgHeight: number,
): BoardSlot[] {
  return imported.map((n) => {
    const old = prev.filter((p) => p.key === n.key)[0];
    if (!old) return asBoardSlot(n, imgHeight);
    const kept = asBoardSlot(old, imgHeight);
    const placed = { ...kept, x: n.x, y: n.y, width: n.width, height: n.height, rotation: n.rotation };
    return followFontSize(kept, placed, imgHeight);
  });
}

/** 바닥 그림을 높이가 다른 그림으로 바꾸면 글자 크기(px)도 같은 배율로 맞춘다. 칸 좌표는 0–1 이라 그대로다. */
export function rescaleFontSizes<T extends Partial<BoardText>>(slots: T[], fromHeight: number, toHeight: number): T[] {
  if (!(fromHeight > 0) || !(toHeight > 0) || fromHeight === toHeight) return slots;
  return slots.map((s) =>
    s.fontSize === undefined ? s : { ...s, fontSize: Math.round(((s.fontSize * toHeight) / fromHeight) * 100) / 100 },
  );
}
