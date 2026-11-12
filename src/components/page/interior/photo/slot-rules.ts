import type { PhotoAssetRef, PhotoSlot } from '@/client/types';

const SLOT_KEY = /^[a-z0-9]{1,8}$/;
const MAX_SLOTS = 10;
const MIN_SIZE = 0.01;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const finite = (n: number) => Number.isFinite(n);
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** 소수 5자리. -0 은 0 으로 바꾼다. */
export function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5 + 0;
}

/** 서버 checkPhotoConfig 의 칸 규칙과 문구를 그대로 따른다. 범위는 돌리기 전 네모 기준이다. 칠판은 maxSlots 4. */
export function slotProblems(slots: PhotoSlot[], maxSlots = MAX_SLOTS): string[] {
  const problems: string[] = [];
  if (slots.length < 1 || slots.length > maxSlots) problems.push(`칸은 1–${maxSlots}개여야 합니다`);

  const seen: Record<string, true> = {};
  for (const s of slots) {
    const at = `칸 ${s.key || '(빈 키)'}`;
    if (!SLOT_KEY.test(s.key)) problems.push(`${at}: 키는 소문자·숫자 1–8자여야 합니다`);
    if (seen[s.key]) problems.push(`${at}: 키가 겹칩니다`);
    seen[s.key] = true;
    const nums = [s.x, s.y, s.width, s.height, s.rotation ?? 0, s.radius ?? 0];
    if (!nums.every(finite)) {
      problems.push(`${at}: 숫자가 아닌 값이 있습니다`);
      continue;
    }
    if (s.x < 0 || s.y < 0) problems.push(`${at}: x·y 는 0 이상이어야 합니다`);
    if (s.width <= 0 || s.height <= 0) problems.push(`${at}: 너비·높이는 0 보다 커야 합니다`);
    if (s.x + s.width > 1 || s.y + s.height > 1) problems.push(`${at}: 칸이 그림 밖으로 나갑니다`);
    if (s.rotation !== undefined && (s.rotation < -45 || s.rotation > 45))
      problems.push(`${at}: 기울기는 −45–45도여야 합니다`);
    if (s.radius !== undefined && (s.radius < 0 || s.radius > 0.5)) problems.push(`${at}: 모서리는 0–0.5 여야 합니다`);
  }
  return problems;
}

/** a…z 중 쓰지 않은 첫 글자. 칸은 많아야 10개라 모자라지 않는다. */
export function nextSlotKey(slots: PhotoSlot[]): string {
  const used = slots.map((s) => s.key);
  for (let i = 0; i < LETTERS.length; i++) {
    if (used.indexOf(LETTERS[i]) < 0) return LETTERS[i];
  }
  throw new Error('칸 키가 모자랍니다');
}

type ImageDraft = {
  base: PhotoAssetRef | null;
  /** 저장된 덮개 에셋을 서버가 못 찾으면 uri 가 null 이다. 그대로 보내면 서버가 "에셋 N 이 없습니다" 400 을 낸다. */
  overlay?: PhotoAssetRef | null;
  imgWidth: number;
  imgHeight: number;
};

/** 바닥·덮개 그림 확인. 사진·칠판이 같이 쓴다. 바닥 그림이나 크기가 없으면 서버가 typia 400 을 낸다. */
export function imageProblems(draft: ImageDraft): string[] {
  const problems: string[] = [];
  if (!draft.base || draft.base.uri === null) problems.push('바닥 그림을 고르세요');
  if (!(draft.imgWidth > 0) || !(draft.imgHeight > 0)) problems.push('바닥 그림 크기를 읽지 못했습니다');
  if (draft.overlay && draft.overlay.uri === null) problems.push('덮개 그림을 다시 고르거나 빼세요');
  return problems;
}

/** 사진 가구 저장 전 확인. */
export function photoConfigProblems(draft: ImageDraft & { slots: PhotoSlot[] }): string[] {
  return [...imageProblems(draft), ...slotProblems(draft.slots)];
}

export function newSlot(slots: PhotoSlot[]): PhotoSlot {
  return { key: nextSlotKey(slots), x: 0.35, y: 0.35, width: 0.3, height: 0.3, rotation: 0, radius: 0 };
}

/** 5자리로 내린다. 끝에 붙인 칸의 시작을 올림하면 시작+크기가 1 을 넘는다. */
const floor5 = (n: number) => Math.floor(n * 1e5 + 1e-9) / 1e5 + 0;

/** 0–1 단위로 옮기고 그림 안으로 자른다. 칠판 칸의 글 속성은 그대로 둔다. */
export function moveSlot<T extends PhotoSlot>(slot: T, dx: number, dy: number): T {
  const axis = (start: number, size: number, delta: number) => {
    const limit = floor5(1 - size);
    return Math.min(round5(clamp(start + delta, 0, 1 - size)), limit);
  };
  return { ...slot, x: axis(slot.x, slot.width, dx), y: axis(slot.y, slot.height, dy) };
}

/** 칸 숫자 칸의 범위. 서버 범위와 같고, 너비·높이는 최소 크기를 지킨다. */
export const SLOT_NUMBER_RANGE = {
  x: { min: 0, max: 1 },
  y: { min: 0, max: 1 },
  width: { min: MIN_SIZE, max: 1 },
  height: { min: MIN_SIZE, max: 1 },
  rotation: { min: -45, max: 45 },
  radius: { min: 0, max: 0.5 },
} as const;

export type SlotNumberField = keyof typeof SLOT_NUMBER_RANGE;

/** 숫자 칸에 쓴 글을 확정한다. 숫자가 아니면 null(입력 중인 '-'·'' 등), 숫자면 범위로 자르고 5자리로 맞춘다. */
export function commitSlotNumber(field: SlotNumberField, raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  const { min, max } = SLOT_NUMBER_RANGE[field];
  return round5(clamp(n, min, max));
}

/** 한 축의 [시작, 끝] 중 한쪽만 움직인다. 반대쪽은 고정, 최소 크기와 [0, 1] 을 지킨다. */
function resizeAxis(start: number, size: number, delta: number, moveStart: boolean): [number, number] {
  const end = start + size;
  if (moveStart) {
    const next = round5(clamp(start + delta, 0, end - MIN_SIZE));
    return [next, round5(end - next)];
  }
  // 시작도 5자리로 맞춰야 시작+크기가 1 을 소수 오차로 넘지 않는다.
  const fixed = round5(start);
  const nextEnd = clamp(end + delta, fixed + MIN_SIZE, 1);
  return [fixed, round5(nextEnd - fixed)];
}

export function resizeSlot<T extends PhotoSlot>(slot: T, corner: 'nw' | 'ne' | 'sw' | 'se', dx: number, dy: number): T {
  const [x, width] = resizeAxis(slot.x, slot.width, dx, corner === 'nw' || corner === 'sw');
  const [y, height] = resizeAxis(slot.y, slot.height, dy, corner === 'nw' || corner === 'ne');
  return { ...slot, x, y, width, height };
}

/** prev 에 있고 next 에 없는 키. 산 공간이 있으면 이 키가 비어야 저장된다. */
export function missingSlotKeys(prev: PhotoSlot[], next: PhotoSlot[]): string[] {
  const nextKeys = next.map((s) => s.key);
  return prev.map((s) => s.key).filter((k) => nextKeys.indexOf(k) < 0);
}
