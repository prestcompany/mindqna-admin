import type { PhotoSlot } from '@/client/types';
import { missingSlotKeys, round5, slotProblems } from './slot-rules';
import { apply, IDENTITY, multiply, parseTransform } from './svg-matrix';

/** extractSvg 가 브라우저에서 만드는 칸 후보 하나. id 가 slot 으로 시작하는 요소만 온다. */
export type SvgNode = {
  id: string;
  tag: string;
  attrs: Record<string, string>;
  /** 뿌리 바로 아래부터 이 요소까지의 transform 속성. 자기 것도 들어 있다. */
  ancestorTransforms: string[];
  /** 조상의 style 에 transform 이 있거나 transform-origin 속성이 있다. */
  ancestorStyleTransform: boolean;
  /** defs·symbol·mask·clipPath·pattern·marker·중첩 svg 안에 있다. */
  inNonRendered: boolean;
  /** 어떤 <use> 가 이 요소를 가리킨다. */
  usedByUse: boolean;
};

export type SvgData = {
  root: { viewBox: string | null; width: string | null; height: string | null };
  nodes: SvgNode[];
};

export type SlotChange = { key: string; kind: 'moved' | 'resized' | 'aspect' | 'added' | 'removed' };

type SlotsResult = { ok: true; slots: PhotoSlot[]; warnings: string[] } | { ok: false; errors: string[] };

const SLOT_ID = /^slot-([a-z0-9]{1,8})$/;
/**
 * 칸 후보: "slot" 뒤에 글자가 오지 않는 id(slot-a, slot_a, slot2, Slot 1). 후보인데 SLOT_ID 가 아니면 거절한다.
 * "slots"·"SlotLayer" 처럼 단어가 이어지면 칸을 담은 그룹 이름이라 무시한다(피그마는 레이어 이름을 id 로 낸다).
 */
export const SLOT_CANDIDATE = /^slot(?![a-z])/i;
const NAME_RULE = '칸 이름은 소문자 slot-<영숫자 1–8>, 중복 금지';
const FRAME_RULE = '바닥 그림과 같은 프레임에서 내보내 주세요';
const NUMBER = /^\s*[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?\s*$/;
const LENGTH = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(?:px)?\s*$/;
/** 경계를 이만큼 넘은 값은 소수 오차로 보고 경계값으로 맞춘다. */
const EDGE_EPS = 1e-6;

type Frame = { x: number; y: number; width: number; height: number };

function toNumber(value: string | undefined): number | null {
  return value !== undefined && NUMBER.test(value) ? Number(value) : null;
}

function readFrame(root: SvgData['root']): Frame | null {
  if (root.viewBox !== null) {
    const parts = root.viewBox.trim().split(/[\s,]+/);
    const n = parts.map(Number);
    if (parts.length !== 4 || !parts.every((p) => NUMBER.test(p)) || !(n[2] > 0) || !(n[3] > 0)) return null;
    return { x: n[0], y: n[1], width: n[2], height: n[3] };
  }
  const w = root.width === null ? null : LENGTH.exec(root.width);
  const h = root.height === null ? null : LENGTH.exec(root.height);
  if (!w || !h || !(Number(w[1]) > 0) || !(Number(h[1]) > 0)) return null;
  return { x: 0, y: 0, width: Number(w[1]), height: Number(h[1]) };
}

/** 반올림 전에 경계를 소수 오차만큼 넘은 값을 맞추고, 반올림한 시작+크기가 1 을 넘지 않게 자른다. */
function fitAxis(start: number, size: number): [number, number] {
  const snapped = start < 0 && start >= -EDGE_EPS ? 0 : start;
  const size5 = round5(size);
  const start5 = round5(snapped);
  if (snapped + size > 1 + EDGE_EPS) return [start5, size5];
  return [Math.min(start5, round5(1 - size5)), size5];
}

function readRadius(attrs: Record<string, string>): { rx: number; ry: number } {
  const valid = (v: number | null) => (v !== null && v >= 0 ? v : null);
  const rx = valid(toNumber(attrs.rx));
  const ry = valid(toNumber(attrs.ry));
  // SVG 규칙: 하나만 있으면 다른 쪽도 같은 값이다.
  return { rx: rx ?? ry ?? 0, ry: ry ?? rx ?? 0 };
}

function structureProblem(node: SvgNode): string | null {
  if (node.tag !== 'rect') return '칸은 네모만 됩니다';
  if (node.inNonRendered) return 'defs·mask 같은 그려지지 않는 요소 안의 칸은 읽지 않습니다';
  if (node.usedByUse) return '<use> 가 가리키는 칸은 읽지 않습니다';
  const ownStyleTransform = /transform/i.test(node.attrs.style ?? '') || 'transform-origin' in node.attrs;
  if (node.ancestorStyleTransform || ownStyleTransform) return 'style 의 transform·transform-origin 은 읽지 못합니다';
  return null;
}

type Placed = { slot: PhotoSlot; warnings: string[] } | { error: string };

/** 요청 2절 "자리 계산" 1–5. 계산은 viewBox 단위에서 하고 마지막에만 0–1 로 나눈다. */
function placeSlot(node: SvgNode, key: string, frame: Frame): Placed {
  let m = IDENTITY;
  for (const t of node.ancestorTransforms) {
    const next = parseTransform(t);
    if (!next) return { error: `transform 을 읽지 못했습니다: ${t}` };
    m = multiply(m, next);
  }
  const x = toNumber(node.attrs.x ?? '0');
  const y = toNumber(node.attrs.y ?? '0');
  const w = toNumber(node.attrs.width);
  const h = toNumber(node.attrs.height);
  if (x === null || y === null || w === null || h === null)
    return { error: 'x·y·width·height 를 숫자로 읽지 못했습니다' };

  // 1. 두 열이 직교가 아니면 기울이기다. 늘린 뒤 돌린 것과 뒤집기는 네모라 받는다.
  const [a, b, c, d] = m;
  const lu = Math.hypot(a, b);
  const lv = Math.hypot(c, d);
  if (Math.abs(a * c + b * d) > 1e-4 * lu * lv) return { error: '기울인 칸은 읽지 못합니다' };

  // 2. 가운데·크기·각도
  const [cx, cy] = apply(m, x + w / 2, y + h / 2);
  let W = w * lu;
  let H = h * lv;
  const r = readRadius(node.attrs);
  let rx = r.rx * lu;
  let ry = r.ry * lv;
  let theta = (Math.atan2(b, a) * 180) / Math.PI;

  // 3. 네모는 180° 대칭이라 (−90, 90] 으로, 45° 를 넘으면 W·H 를 바꿔 [−45, 45] 로 넣는다.
  while (theta > 90) theta -= 180;
  while (theta <= -90) theta += 180;
  if (Math.abs(theta) > 45) {
    [W, H] = [H, W];
    [rx, ry] = [ry, rx];
    theta -= theta > 0 ? 90 : -90;
  }

  // 4. 모서리
  rx = Math.min(rx, W / 2);
  ry = Math.min(ry, H / 2);
  const warnings: string[] = [];
  if (Math.abs(rx - ry) > 1e-6 * Math.max(W, H)) warnings.push('가로·세로 모서리 둥글기가 달라 작은 쪽으로 맞춥니다');

  // 5. 0–1 로 나누기
  const [sx, width] = fitAxis((cx - W / 2 - frame.x) / frame.width, W / frame.width);
  const [sy, height] = fitAxis((cy - H / 2 - frame.y) / frame.height, H / frame.height);
  const slot: PhotoSlot = {
    key,
    x: sx,
    y: sy,
    width,
    height,
    rotation: round5(theta),
    radius: W > 0 ? round5(Math.min(rx, ry) / W) : 0,
  };

  const rad = (theta * Math.PI) / 180;
  const ex = (Math.abs(W * Math.cos(rad)) + Math.abs(H * Math.sin(rad))) / 2;
  const ey = (Math.abs(W * Math.sin(rad)) + Math.abs(H * Math.cos(rad))) / 2;
  const tol = EDGE_EPS * Math.max(frame.width, frame.height);
  if (
    cx - ex < frame.x - tol ||
    cy - ey < frame.y - tol ||
    cx + ex > frame.x + frame.width + tol ||
    cy + ey > frame.y + frame.height + tol
  )
    warnings.push('돌린 모서리가 그림 밖으로 나갑니다(앱은 그대로 그립니다)');
  if (node.attrs.stroke !== undefined && node.attrs.stroke.trim() !== 'none')
    warnings.push('선(stroke)은 칸 크기에 들어가지 않습니다. 선 없이 내보내 주세요');

  return { slot, warnings };
}

/**
 * 피그마 SVG 의 칸 네모를 PhotoSlot 으로 바꾼다. 거절이 하나라도 있으면 칸을 하나도 돌려주지 않는다.
 * existingKeys 는 저장된 설정의 키다. 산 공간이 있으면 그 키가 모두 있어야 한다.
 */
export function slotsFromSvg(
  data: SvgData,
  image: { imgWidth: number; imgHeight: number },
  existingKeys: string[],
  purchasedCount: number,
  /** 칠판은 칸 4개까지, 끊기는 내용은 "글". */
  options: { maxSlots: number; content: string } = { maxSlots: 10, content: '사진' },
): SlotsResult {
  const frame = readFrame(data.root);
  if (!frame)
    return { ok: false, errors: [`SVG 크기(viewBox 또는 숫자 width·height)를 읽지 못했습니다. ${FRAME_RULE}`] };

  const errors: string[] = [];
  const warnings: string[] = [];
  const ratio = Math.abs(frame.width / frame.height / (image.imgWidth / image.imgHeight) - 1);
  if (ratio > 0.01)
    errors.push(`SVG 프레임(${frame.width}×${frame.height})의 비율이 바닥 그림과 다릅니다. ${FRAME_RULE}`);

  const scale = image.imgWidth / frame.width;
  const whole = Math.round(scale);
  if (Math.abs(scale - whole) > 0.05 || whole < 1 || whole > 4)
    warnings.push(`바닥 그림이 SVG 프레임의 ${round5(scale)}배입니다. 같은 프레임에서 내보냈는지 확인해 주세요`);

  const slots: PhotoSlot[] = [];
  const seen: Record<string, true> = {};
  let named = 0;
  for (const node of data.nodes) {
    if (!SLOT_CANDIDATE.test(node.id)) continue;
    const key = SLOT_ID.exec(node.id)?.[1];
    if (key === undefined || seen[key]) {
      errors.push(`${node.id}: ${NAME_RULE}`);
      continue;
    }
    seen[key] = true;
    named++;
    const structure = structureProblem(node);
    if (structure) {
      errors.push(`${node.id}: ${structure}`);
      continue;
    }
    const placed = placeSlot(node, key, frame);
    if ('error' in placed) {
      errors.push(`${node.id}: ${placed.error}`);
      continue;
    }
    for (const p of slotProblems([placed.slot], options.maxSlots)) errors.push(`${p} (돌리기 전 네모 기준)`);
    for (const w of placed.warnings) warnings.push(`${node.id}: ${w}`);
    slots.push(placed.slot);
  }

  if (named < 1 || named > options.maxSlots) errors.push(`칸은 1–${options.maxSlots}개여야 합니다`);

  if (purchasedCount > 0) {
    const prev = existingKeys.map((k) => ({ key: k, x: 0, y: 0, width: 0, height: 0 }));
    const missing = missingSlotKeys(prev, slots);
    if (missing.length)
      errors.push(
        `칸 ${missing.join(', ')} 이 SVG 에 없습니다. 산 공간 ${purchasedCount}곳의 ${options.content}이 끊깁니다`,
      );
  }

  return errors.length ? { ok: false, errors } : { ok: true, slots, warnings };
}

/** 덮어쓰기 확인 화면의 키별 변화. aspect 는 너비/높이 비율이 10% 넘게 바뀐 경우다. */
export function slotChanges(prev: PhotoSlot[], next: PhotoSlot[]): SlotChange[] {
  const changes: SlotChange[] = [];
  for (const n of next) {
    const p = prev.filter((s) => s.key === n.key)[0];
    if (!p) {
      changes.push({ key: n.key, kind: 'added' });
      continue;
    }
    if (p.x !== n.x || p.y !== n.y) changes.push({ key: n.key, kind: 'moved' });
    if (p.width !== n.width || p.height !== n.height) changes.push({ key: n.key, kind: 'resized' });
    if (Math.abs(n.width / n.height / (p.width / p.height) - 1) > 0.1) changes.push({ key: n.key, kind: 'aspect' });
  }
  for (const key of missingSlotKeys(prev, next)) changes.push({ key, kind: 'removed' });
  return changes;
}
