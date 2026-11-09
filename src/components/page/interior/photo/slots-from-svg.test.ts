import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PhotoSlot } from '@/client/types';
import { type SvgData, type SvgNode, slotChanges, slotsFromSvg } from './slots-from-svg';

const IMAGE = { imgWidth: 420, imgHeight: 200 };

const node = (id: string, attrs: Record<string, string> = {}, over: Partial<SvgNode> = {}): SvgNode => ({
  id,
  tag: 'rect',
  attrs: { id, x: '21', y: '40', width: '105', height: '120', ...attrs },
  ancestorTransforms: attrs.transform ? [attrs.transform] : [],
  ancestorStyleTransform: false,
  inNonRendered: false,
  usedByUse: false,
  ...over,
});

const svg = (nodes: SvgNode[], root: Partial<SvgData['root']> = {}): SvgData => ({
  root: { viewBox: '0 0 420 200', width: '420', height: '200', ...root },
  nodes,
});

const read = (data: SvgData, image = IMAGE, existingKeys: string[] = [], purchasedCount = 0) =>
  slotsFromSvg(data, image, existingKeys, purchasedCount);

function accepted(data: SvgData, image = IMAGE, existingKeys: string[] = [], purchasedCount = 0) {
  const result = read(data, image, existingKeys, purchasedCount);
  if (!result.ok) assert.fail(`expected ok, got ${result.errors.join(' / ')}`);
  return result;
}

function rejected(data: SvgData, image = IMAGE, existingKeys: string[] = [], purchasedCount = 0) {
  const result = read(data, image, existingKeys, purchasedCount);
  if (result.ok) assert.fail(`expected rejection, got ${JSON.stringify(result.slots)}`);
  assert.equal('slots' in result, false);
  assert.ok(result.errors.length > 0);
  return result.errors;
}

const only = (data: SvgData, image = IMAGE): PhotoSlot => {
  const { slots } = accepted(data, image);
  assert.equal(slots.length, 1);
  return slots[0];
};

const near = (actual: PhotoSlot, expected: PhotoSlot) => {
  assert.equal(actual.key, expected.key);
  for (const k of ['x', 'y', 'width', 'height', 'rotation', 'radius'] as const) {
    const a = actual[k] ?? 0;
    const e = expected[k] ?? 0;
    assert.ok(Math.abs(a - e) <= 1e-5, `${k}: ${a} ≉ ${e}`);
  }
};

const PLAIN: PhotoSlot = { key: 'a', x: 0.05, y: 0.2, width: 0.25, height: 0.6, rotation: 0, radius: 0 };
// 가운데 (73.5, 100)
const CENTER = '73.5 100';

// ── 받는 경우

test('plain rect', () => {
  assert.deepEqual(only(svg([node('slot-a')])), PLAIN);
  assert.deepEqual(accepted(svg([node('slot-a')])).warnings, []);
});

test('rotate around the center keeps the size', () => {
  near(only(svg([node('slot-a', { transform: `rotate(-6 ${CENTER})` })])), { ...PLAIN, rotation: -6 });
});

test('matrix', () => {
  assert.deepEqual(only(svg([node('slot-a', { x: '0', y: '0', transform: 'matrix(1 0 0 1 21 40)' })])), PLAIN);
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  // 원점 기준 30° 를 가운데 기준으로 되돌린다: 가운데가 (73.5,100) 에 오게 e,f 를 고른다.
  const e = 73.5 - (c * 73.5 - s * 100);
  const f = 100 - (s * 73.5 + c * 100);
  near(only(svg([node('slot-a', { transform: `matrix(${c} ${s} ${-s} ${c} ${e} ${f})` })])), {
    ...PLAIN,
    rotation: 30,
  });
});

test('flip matrix (negative determinant) is accepted', () => {
  // 가로 뒤집기: 가운데 (73.5,100) → (346.5,100)
  near(only(svg([node('slot-a', { transform: 'matrix(-1 0 0 1 420 0)' })])), { ...PLAIN, x: 0.7 });
  near(only(svg([node('slot-a', { transform: 'matrix(1 0 0 -1 0 200)' })])), { ...PLAIN, y: 0.2 });
});

test('ancestor g translate', () => {
  const n = node('slot-a', { x: '11', y: '20' }, { ancestorTransforms: ['translate(10 20)'] });
  assert.deepEqual(only(svg([n])), PLAIN);
  const nested = node('slot-a', { x: '1', y: '20', transform: 'translate(10)' });
  nested.ancestorTransforms = ['translate(10 20)', 'translate(10)'];
  assert.deepEqual(only(svg([nested])), PLAIN);
});

test('stretch then rotate is a rectangle; rotate then stretch is a skew', () => {
  // rotate(30) scale(2,1): 가로 2배 네모를 30° 돌림
  const ok = only(
    svg([node('slot-a', { x: '50', y: '20', width: '50', height: '40', transform: 'rotate(30) scale(2,1)' })]),
  );
  assert.ok(Math.abs((ok.rotation ?? 0) - 30) <= 1e-5);
  assert.ok(Math.abs(ok.width - 100 / 420) <= 1e-5);
  assert.ok(Math.abs(ok.height - 40 / 200) <= 1e-5);

  const errors = rejected(
    svg([node('slot-a', { x: '50', y: '20', width: '50', height: '40', transform: 'scale(2,1) rotate(30)' })]),
  );
  assert.equal(errors.length, 1);
  assert.match(errors[0], /slot-a/);
});

test('90° swaps W and H and becomes 0°', () => {
  // 105×120 을 90° 돌리면 120×105 인 0° 네모
  near(only(svg([node('slot-a', { transform: `rotate(90 ${CENTER})` })])), {
    key: 'a',
    x: (73.5 - 60) / 420,
    y: (100 - 52.5) / 200,
    width: 120 / 420,
    height: 105 / 200,
    rotation: 0,
    radius: 0,
  });
});

test('180° becomes 0°, −174° becomes 6°', () => {
  near(only(svg([node('slot-a', { transform: `rotate(180 ${CENTER})` })])), PLAIN);
  near(only(svg([node('slot-a', { transform: `rotate(-174 ${CENTER})` })])), { ...PLAIN, rotation: 6 });
});

test('±60° swaps W and H and lands at ∓30°', () => {
  const swapped = {
    key: 'a',
    x: (73.5 - 60) / 420,
    y: (100 - 52.5) / 200,
    width: 120 / 420,
    height: 105 / 200,
    radius: 0,
  };
  near(only(svg([node('slot-a', { transform: `rotate(60 ${CENTER})` })])), { ...swapped, rotation: -30 });
  near(only(svg([node('slot-a', { transform: `rotate(-60 ${CENTER})` })])), { ...swapped, rotation: 30 });
});

test('±45° stays without swapping', () => {
  near(only(svg([node('slot-a', { transform: `rotate(45 ${CENTER})` })])), { ...PLAIN, rotation: 45 });
  near(only(svg([node('slot-a', { transform: `rotate(-45 ${CENTER})` })])), { ...PLAIN, rotation: -45 });
});

test('viewBox that does not start at 0', () => {
  assert.deepEqual(only(svg([node('slot-a', { x: '31', y: '60' })], { viewBox: '10 20 420 200' })), PLAIN);
});

test('viewBox from numeric width and height when viewBox is missing', () => {
  assert.deepEqual(only(svg([node('slot-a')], { viewBox: null, width: '420', height: '200' })), PLAIN);
});

test('30° slot on a non-square viewBox keeps its angle', () => {
  near(only(svg([node('slot-a', { x: '100', y: '50', width: '80', height: '40', transform: 'rotate(30 140 70)' })])), {
    key: 'a',
    x: 100 / 420,
    y: 0.25,
    width: 80 / 420,
    height: 0.2,
    rotation: 30,
    radius: 0,
  });
});

test('rx alone sets ry to the same value', () => {
  const result = accepted(svg([node('slot-a', { rx: '10' })]));
  assert.equal(result.slots[0].radius, 0.09524);
  assert.deepEqual(result.warnings, []);
  assert.equal(only(svg([node('slot-a', { ry: '10' })])).radius, 0.09524);
});

test('rx larger than w/2 is clipped', () => {
  const square = { width: '100', height: '100', y: '50' };
  const result = accepted(svg([node('slot-a', { ...square, rx: '80' })]));
  assert.equal(result.slots[0].radius, 0.5);
  assert.deepEqual(result.warnings, []);
});

test('radius = min(rx, ry)/W and a warning when they differ', () => {
  const result = accepted(svg([node('slot-a', { rx: '10', ry: '20' })]));
  assert.equal(result.slots[0].radius, 0.09524);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /slot-a/);
});

test('radius follows the transform scale', () => {
  // scale(2): rx' = 20, W = 210 → 같은 비율
  const result = accepted(
    svg([node('slot-a', { x: '10.5', y: '20', width: '52.5', height: '60', rx: '10', transform: 'scale(2)' })]),
  );
  near(result.slots[0], { ...PLAIN, radius: 20 / 105 });
});

test('boundary rounding errors snap to the boundary', () => {
  // x = −1e-7, x+width = 1+1e-7
  const s = only(svg([node('slot-a', { x: '-0.000042', width: '420.000084', y: '0', height: '200' })]));
  assert.deepEqual([s.x, s.width, s.y, s.height], [0, 1, 0, 1]);
  const right = only(svg([node('slot-a', { x: '315', width: '105.000042' })]));
  assert.deepEqual([right.x, right.width], [0.75, 0.25]);
});

test('snap before rounding: a slot touching the right edge does not round to 1.00001', () => {
  // x = 0.714345, width = 0.285655: 따로 반올림하면 0.71435 + 0.28566 = 1.00001
  const s = only(svg([node('slot-a', { x: '300.0249', width: '119.9751' })]));
  assert.equal(s.width, 0.28566);
  assert.equal(s.x, 0.71434);
  assert.ok(s.x + s.width <= 1);
});

test('purchased template accepts the same keys plus new ones', () => {
  const result = accepted(svg([node('slot-a'), node('slot-b', { x: '200' })]), IMAGE, ['a'], 3);
  assert.deepEqual(
    result.slots.map((s) => s.key),
    ['a', 'b'],
  );
});

test('rotated corners outside the image only warn', () => {
  // 0° 로는 그림 안이지만 돌리면 모서리가 위로 나간다
  const result = accepted(svg([node('slot-a', { y: '0', height: '100', transform: `rotate(30 73.5 50)` })]));
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /slot-a/);
});

// ── 거절

test('skew is rejected', () => {
  const errors = rejected(svg([node('slot-a', { transform: 'skewX(10)' })]));
  assert.match(errors[0], /slot-a/);
});

test('unreadable transform is rejected', () => {
  rejected(svg([node('slot-a', { transform: 'rotate(' })]));
});

test('no viewBox and a percent width is rejected', () => {
  rejected(svg([node('slot-a')], { viewBox: null, width: '100%', height: '200' }));
});

test('no viewBox, width or height is rejected', () => {
  rejected(svg([node('slot-a')], { viewBox: null, width: null, height: null }));
});

test('aspect ratio more than 1% off is rejected', () => {
  const errors = rejected(svg([node('slot-a')]), { imgWidth: 400, imgHeight: 200 });
  assert.ok(errors.some((e) => e.includes('바닥 그림과 같은 프레임에서 내보내 주세요')));
});

test('aspect ratio within 1% is accepted', () => {
  accepted(svg([node('slot-a')]), { imgWidth: 842, imgHeight: 400 });
});

test('a non-rect slot is rejected', () => {
  const errors = rejected(svg([node('slot-a', {}, { tag: 'path' })]));
  assert.deepEqual(errors, ['slot-a: 칸은 네모만 됩니다']);
  rejected(svg([node('slot-a', {}, { tag: 'g' })]));
});

test('bad slot names are rejected, not ignored', () => {
  for (const id of ['slot-a_2', 'slot-A', 'slot_a', 'SLOT-a', 'slot-abcdefghi']) {
    const errors = rejected(svg([node('slot-b'), node(id)]));
    assert.deepEqual(errors, [`${id}: 칸 이름은 소문자 slot-<영숫자 1–8>, 중복 금지`]);
  }
});

test('two slots with the same key are rejected', () => {
  const errors = rejected(svg([node('slot-a'), node('slot-a', { x: '200' })]));
  assert.deepEqual(errors, ['slot-a: 칸 이름은 소문자 slot-<영숫자 1–8>, 중복 금지']);
});

test('slots in non-rendered elements or used by <use> are rejected', () => {
  rejected(svg([node('slot-a', {}, { inNonRendered: true })]));
  rejected(svg([node('slot-a', {}, { usedByUse: true })]));
});

test('style transform and transform-origin are rejected', () => {
  rejected(svg([node('slot-a', { style: 'transform: rotate(10deg)' })]));
  rejected(svg([node('slot-a', { 'transform-origin': 'center' })]));
  rejected(svg([node('slot-a', {}, { ancestorStyleTransform: true })]));
});

test('zero or eleven slots are rejected', () => {
  assert.deepEqual(rejected(svg([])), ['칸은 1–10개여야 합니다']);
  const eleven = 'abcdefghijk'.split('').map((k, i) => node(`slot-${k}`, { x: String(i * 30), width: '20' }));
  assert.deepEqual(rejected(svg(eleven)), ['칸은 1–10개여야 합니다']);
  accepted(svg(eleven.slice(0, 10)));
});

test('out-of-range slot names the unrotated rectangle', () => {
  const errors = rejected(svg([node('slot-a', { x: '400' })]));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /돌리기 전 네모 기준/);
});

test('purchased template rejects an SVG missing an existing key', () => {
  const errors = rejected(svg([node('slot-b')]), IMAGE, ['a'], 3);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /a/);
  assert.match(errors[0], /산 공간 3곳/);
  // 산 공간이 없으면 키가 빠져도 받는다
  accepted(svg([node('slot-b')]), IMAGE, ['a'], 0);
});

test('one bad slot rejects the whole import', () => {
  const errors = rejected(svg([node('slot-a'), node('slot-b', { x: '400' }), node('slot-c', {}, { tag: 'ellipse' })]));
  assert.equal(errors.length, 2);
});

// ── 무시

test('elements not starting with slot are ignored', () => {
  assert.deepEqual(
    only(svg([node('frame-1', {}, { tag: 'g' }), node('slot-a'), node('guide', {}, { tag: 'path' })])),
    PLAIN,
  );
});

// ── 경고

test('scale far from an integer 1–4 warns', () => {
  const half = accepted(svg([node('slot-a')]), { imgWidth: 1050, imgHeight: 500 });
  assert.equal(half.warnings.length, 1);
  assert.deepEqual(half.slots[0], PLAIN);
  assert.deepEqual(accepted(svg([node('slot-a')]), { imgWidth: 840, imgHeight: 400 }).warnings, []);
  assert.deepEqual(accepted(svg([node('slot-a')]), { imgWidth: 1680, imgHeight: 800 }).warnings, []);
  assert.equal(accepted(svg([node('slot-a')]), { imgWidth: 2100, imgHeight: 1000 }).warnings.length, 1);
  assert.equal(accepted(svg([node('slot-a')]), { imgWidth: 210, imgHeight: 100 }).warnings.length, 1);
  assert.deepEqual(accepted(svg([node('slot-a')]), { imgWidth: 430, imgHeight: 204.76 }).warnings, []);
});

test('a stroke warns, stroke none does not', () => {
  assert.equal(accepted(svg([node('slot-a', { stroke: '#000' })])).warnings.length, 1);
  assert.deepEqual(accepted(svg([node('slot-a', { stroke: 'none' })])).warnings, []);
});

// ── slotChanges

test('slotChanges', () => {
  const a: PhotoSlot = { key: 'a', x: 0.1, y: 0.1, width: 0.2, height: 0.2 };
  const b: PhotoSlot = { key: 'b', x: 0.5, y: 0.5, width: 0.2, height: 0.2 };
  assert.deepEqual(slotChanges([a, b], [a, b]), []);
  assert.deepEqual(slotChanges([a], [{ ...a, x: 0.2 }]), [{ key: 'a', kind: 'moved' }]);
  assert.deepEqual(slotChanges([a], [{ ...a, width: 0.21 }]), [{ key: 'a', kind: 'resized' }]);
  assert.deepEqual(slotChanges([a], [{ ...a, width: 0.3 }]), [
    { key: 'a', kind: 'resized' },
    { key: 'a', kind: 'aspect' },
  ]);
  assert.deepEqual(slotChanges([a], [a, b]), [{ key: 'b', kind: 'added' }]);
  assert.deepEqual(slotChanges([a, b], [b]), [{ key: 'a', kind: 'removed' }]);
});
