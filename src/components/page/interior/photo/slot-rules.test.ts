import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PhotoSlot } from '@/client/types';
import {
  missingSlotKeys,
  moveSlot,
  newSlot,
  nextSlotKey,
  photoConfigProblems,
  resizeSlot,
  round5,
  slotProblems,
} from './slot-rules';

const slot = (over: Partial<PhotoSlot> = {}): PhotoSlot => ({
  key: 'a',
  x: 0.1,
  y: 0.1,
  width: 0.2,
  height: 0.2,
  rotation: 0,
  radius: 0,
  ...over,
});

const keys = (...ks: string[]): PhotoSlot[] => ks.map((key) => slot({ key }));

test('slotProblems: slot count must be 1-10', () => {
  assert.deepEqual(slotProblems([]), ['칸은 1–10개여야 합니다']);
  const eleven = 'abcdefghijk'.split('').map((key) => slot({ key }));
  assert.deepEqual(slotProblems(eleven), ['칸은 1–10개여야 합니다']);
  assert.deepEqual(slotProblems(eleven.slice(0, 10)), []);
});

test('slotProblems: range, rotation and radius', () => {
  assert.deepEqual(slotProblems([slot({ x: 0.8, width: 0.2000001 })]), ['칸 a: 칸이 그림 밖으로 나갑니다']);
  assert.deepEqual(slotProblems([slot({ rotation: 46 })]), ['칸 a: 기울기는 −45–45도여야 합니다']);
  assert.deepEqual(slotProblems([slot({ radius: 0.6 })]), ['칸 a: 모서리는 0–0.5 여야 합니다']);
  assert.deepEqual(slotProblems([slot({ x: -0.1 })]), ['칸 a: x·y 는 0 이상이어야 합니다']);
  assert.deepEqual(slotProblems([slot({ height: 0 })]), ['칸 a: 너비·높이는 0 보다 커야 합니다']);
  assert.deepEqual(slotProblems([slot({ y: Number.NaN })]), ['칸 a: 숫자가 아닌 값이 있습니다']);
});

test('slotProblems: boundary values pass', () => {
  assert.deepEqual(slotProblems([slot({ x: 0.8, width: 0.2, y: 0, height: 1, rotation: -45, radius: 0.5 })]), []);
  assert.deepEqual(slotProblems([slot({ rotation: 45, radius: 0 })]), []);
  assert.deepEqual(slotProblems([{ key: 'a', x: 0, y: 0, width: 1, height: 1 }]), []);
});

test('slotProblems: key format and duplicates', () => {
  assert.deepEqual(slotProblems([slot({ key: 'A' })]), ['칸 A: 키는 소문자·숫자 1–8자여야 합니다']);
  assert.deepEqual(slotProblems([slot({ key: 'abcdefghi' })]), ['칸 abcdefghi: 키는 소문자·숫자 1–8자여야 합니다']);
  assert.deepEqual(slotProblems([slot({ key: '' })]), ['칸 (빈 키): 키는 소문자·숫자 1–8자여야 합니다']);
  assert.deepEqual(slotProblems(keys('a', 'b', 'a')), ['칸 a: 키가 겹칩니다']);
});

test('nextSlotKey picks the first unused letter', () => {
  assert.equal(nextSlotKey([]), 'a');
  assert.equal(nextSlotKey(keys('a', 'b', 'd')), 'c');
  assert.equal(nextSlotKey(keys('b')), 'a');
});

test('newSlot is a centered 0.3 square with the next key', () => {
  assert.deepEqual(newSlot(keys('a')), { key: 'b', x: 0.35, y: 0.35, width: 0.3, height: 0.3, rotation: 0, radius: 0 });
});

test('photoConfigProblems', () => {
  const base = { id: 1, uri: 'https://cdn/base.png' };
  const slots = [slot()];
  assert.deepEqual(photoConfigProblems({ base: null, imgWidth: 420, imgHeight: 200, slots }), ['바닥 그림을 고르세요']);
  assert.deepEqual(photoConfigProblems({ base: { id: 1, uri: null }, imgWidth: 420, imgHeight: 200, slots }), [
    '바닥 그림을 고르세요',
  ]);
  assert.deepEqual(photoConfigProblems({ base, imgWidth: 0, imgHeight: 200, slots }), [
    '바닥 그림 크기를 읽지 못했습니다',
  ]);
  assert.deepEqual(photoConfigProblems({ base, imgWidth: 420, imgHeight: 200, slots: [slot({ radius: 0.6 })] }), [
    '칸 a: 모서리는 0–0.5 여야 합니다',
  ]);
  assert.deepEqual(photoConfigProblems({ base, imgWidth: 420, imgHeight: 200, slots }), []);
});

test('moveSlot keeps the slot inside the image', () => {
  assert.equal(moveSlot(slot({ x: 0.9, width: 0.2 }), 0.3, 0).x, 0.8);
  const moved = moveSlot(slot({ x: 0.1, y: 0.2 }), -0.5, -0.5);
  assert.equal(moved.x, 0);
  assert.equal(moved.y, 0);
  assert.deepEqual(moveSlot(slot({ x: 0.1, y: 0.1 }), 0.1234567, 0.2), slot({ x: 0.22346, y: 0.3 }));
});

test('moveSlot to the far edge stays valid', () => {
  const s = moveSlot(slot({ x: 0.1, width: 0.33333 }), 5, 5);
  assert.deepEqual(slotProblems([s]), []);
});

test('resizeSlot keeps the opposite corner and a 0.01 minimum', () => {
  const s = slot({ x: 0.2, y: 0.3, width: 0.4, height: 0.5 });
  const shrunk = resizeSlot(s, 'se', -1, -1);
  assert.equal(shrunk.x, 0.2);
  assert.equal(shrunk.y, 0.3);
  assert.equal(shrunk.width, 0.01);
  assert.equal(shrunk.height, 0.01);

  const grown = resizeSlot(s, 'nw', -1, -1);
  assert.equal(grown.x, 0);
  assert.equal(grown.y, 0);
  assert.equal(round5(grown.x + grown.width), 0.6);
  assert.equal(round5(grown.y + grown.height), 0.8);

  const ne = resizeSlot(s, 'ne', 1, 1);
  assert.deepEqual([ne.x, ne.y, ne.width, ne.height], [0.2, 0.79, 0.8, 0.01]);

  const sw = resizeSlot(s, 'sw', 1, 1);
  assert.deepEqual([sw.x, sw.y, sw.width, sw.height], [0.59, 0.3, 0.01, 0.7]);
  assert.deepEqual(slotProblems([ne]), []);
  assert.deepEqual(slotProblems([sw]), []);
});

test('missingSlotKeys lists removed keys only', () => {
  assert.deepEqual(missingSlotKeys(keys('a', 'b'), keys('a', 'c')), ['b']);
  assert.deepEqual(missingSlotKeys(keys('a'), keys('a', 'b')), []);
});

test('round5', () => {
  assert.equal(round5(0.123456), 0.12346);
  assert.ok(Object.is(round5(-0.000001), 0));
});
