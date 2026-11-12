import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BoardSlot, PhotoSlot } from '@/client/types';
import {
  asBoardSlot,
  boardSlotProblems,
  commitBoardNumber,
  defaultFontSize,
  followFontSize,
  mergeImportedSlots,
  newBoardSlot,
  rescaleFontSizes,
} from './board-rules';

const IMG_H = 400;

const board = (over: Partial<BoardSlot> = {}): BoardSlot => ({
  key: 'a',
  x: 0.1,
  y: 0.1,
  width: 0.5,
  height: 0.3,
  rotation: 0,
  color: '#FFFFFF',
  fontSize: 32,
  maxLength: 20,
  maxLines: 3,
  align: 'center',
  ...over,
});

test('the default font size fills the slot height with max lines at line height 1.25', () => {
  // 0.3 × 400 = 120px, 120 ÷ (3 × 1.25) = 32
  assert.equal(defaultFontSize({ height: 0.3, maxLines: 3 }, IMG_H), 32);
  // 0.25 × 400 = 100px, 100 ÷ 3.75 = 26.666… → rounded down to 2 places so it never exceeds the slot
  assert.equal(defaultFontSize({ height: 0.25, maxLines: 3 }, IMG_H), 26.66);
});

test('a new board slot takes the next key and the board defaults, without a radius', () => {
  const slot = newBoardSlot([board({ key: 'a' })], IMG_H);
  assert.deepEqual(slot, {
    key: 'b',
    x: 0.35,
    y: 0.35,
    width: 0.3,
    height: 0.3,
    rotation: 0,
    color: '#FFFFFF',
    fontSize: 32,
    maxLength: 20,
    maxLines: 3,
    align: 'center',
  });
});

test('asBoardSlot drops the photo radius and fills missing text fields with defaults', () => {
  const photo: PhotoSlot = { key: 'a', x: 0, y: 0, width: 1, height: 0.3, rotation: 5, radius: 0.1 };
  assert.deepEqual(asBoardSlot(photo, IMG_H), {
    key: 'a',
    x: 0,
    y: 0,
    width: 1,
    height: 0.3,
    rotation: 5,
    color: '#FFFFFF',
    fontSize: 32,
    maxLength: 20,
    maxLines: 3,
    align: 'center',
  });
});

test('asBoardSlot keeps text fields that are already set', () => {
  const saved = board({ color: '#463825', fontSize: 12, maxLength: 7, maxLines: 2, align: 'left' });
  assert.deepEqual(asBoardSlot(saved, IMG_H), saved);
});

test('a default font size follows the slot height and max lines; a typed one stays', () => {
  const prev = board({ height: 0.3, fontSize: 32 });
  assert.equal(followFontSize(prev, { ...prev, height: 0.15 }, IMG_H).fontSize, 16);
  assert.equal(followFontSize(prev, { ...prev, maxLines: 1 }, IMG_H).fontSize, 96);
  const typed = board({ height: 0.3, fontSize: 20 });
  assert.equal(followFontSize(typed, { ...typed, height: 0.15 }, IMG_H).fontSize, 20);
  // 위치만 바뀌면 그대로
  assert.equal(followFontSize(prev, { ...prev, x: 0.2 }, IMG_H).fontSize, 32);
});

test('boardSlotProblems accepts a valid slot and 8-digit colors', () => {
  assert.deepEqual(boardSlotProblems([board()], IMG_H), []);
  assert.deepEqual(boardSlotProblems([board({ color: '#46382599' })], IMG_H), []);
  assert.deepEqual(boardSlotProblems([board({ align: undefined })], IMG_H), []);
});

test('boardSlotProblems allows 1-4 slots', () => {
  assert.deepEqual(boardSlotProblems([], IMG_H), ['칸은 1–4개여야 합니다']);
  const five = ['a', 'b', 'c', 'd', 'e'].map((key) => board({ key, width: 0.1, height: 0.1, fontSize: 10 }));
  assert.deepEqual(boardSlotProblems(five, IMG_H), ['칸은 1–4개여야 합니다']);
});

test('boardSlotProblems rejects each bad text field', () => {
  const one = (over: Partial<BoardSlot>) => boardSlotProblems([board(over)], IMG_H);
  assert.deepEqual(one({ color: 'FFFFFF' }), ['칸 a: 글자색은 #RRGGBB 또는 #RRGGBBAA 여야 합니다']);
  assert.deepEqual(one({ color: '#FFF' }), ['칸 a: 글자색은 #RRGGBB 또는 #RRGGBBAA 여야 합니다']);
  assert.deepEqual(one({ fontSize: 0 }), ['칸 a: 글자 크기는 0 보다 크고 칸 높이(120px) 이하여야 합니다']);
  assert.deepEqual(one({ fontSize: 121 }), ['칸 a: 글자 크기는 0 보다 크고 칸 높이(120px) 이하여야 합니다']);
  assert.deepEqual(one({ maxLength: 0 }), ['칸 a: 최대 글자 수는 1–100 정수여야 합니다']);
  assert.deepEqual(one({ maxLength: 101 }), ['칸 a: 최대 글자 수는 1–100 정수여야 합니다']);
  assert.deepEqual(one({ maxLength: 1.5 }), ['칸 a: 최대 글자 수는 1–100 정수여야 합니다']);
  assert.deepEqual(one({ maxLines: 0 }), ['칸 a: 최대 줄 수는 1–10 정수여야 합니다']);
  assert.deepEqual(one({ maxLines: 11 }), ['칸 a: 최대 줄 수는 1–10 정수여야 합니다']);
  assert.deepEqual(one({ align: 'right' as BoardSlot['align'] }), ['칸 a: 정렬은 가운데 또는 왼쪽이어야 합니다']);
});

test('boardSlotProblems keeps the shared slot rules', () => {
  assert.deepEqual(boardSlotProblems([board({ x: 0.6 })], IMG_H), ['칸 a: 칸이 그림 밖으로 나갑니다']);
});

test('commitBoardNumber clamps counts to integers and the font size to the slot height', () => {
  assert.equal(commitBoardNumber('maxLength', '20.6', 120), 21);
  assert.equal(commitBoardNumber('maxLength', '500', 120), 100);
  assert.equal(commitBoardNumber('maxLines', '0', 120), 1);
  assert.equal(commitBoardNumber('fontSize', '200', 120), 120);
  assert.equal(commitBoardNumber('fontSize', '12.345', 120), 12.35);
  assert.equal(commitBoardNumber('fontSize', '', 120), null);
  assert.equal(commitBoardNumber('maxLines', 'abc', 120), null);
});

test('an SVG import keeps text settings of existing keys and fills new keys with defaults', () => {
  const prev = [board({ key: 'a', color: '#463825', fontSize: 20, maxLength: 7 })];
  const imported: PhotoSlot[] = [
    { key: 'a', x: 0.2, y: 0.2, width: 0.4, height: 0.15, rotation: 3, radius: 0 },
    { key: 'b', x: 0, y: 0.6, width: 0.5, height: 0.3, rotation: 0, radius: 0 },
  ];
  assert.deepEqual(mergeImportedSlots(prev, imported, IMG_H), [
    { ...prev[0], x: 0.2, y: 0.2, width: 0.4, height: 0.15, rotation: 3 },
    asBoardSlot(imported[1], IMG_H),
  ]);
});

test('an SVG import lets a default font size follow the new height', () => {
  const prev = [board({ key: 'a', height: 0.3, fontSize: 32 })];
  const imported: PhotoSlot[] = [{ key: 'a', x: 0.1, y: 0.1, width: 0.5, height: 0.15, rotation: 0, radius: 0 }];
  assert.equal(mergeImportedSlots(prev, imported, IMG_H)[0].fontSize, 16);
});

test('picking a base image of another height scales font sizes with it', () => {
  const slots = [board({ fontSize: 32 }), board({ key: 'b', fontSize: 10 })];
  assert.deepEqual(
    rescaleFontSizes(slots, 400, 800).map((s) => s.fontSize),
    [64, 20],
  );
  assert.equal(rescaleFontSizes(slots, 400, 400), slots);
  assert.equal(rescaleFontSizes(slots, 0, 800), slots);
});
