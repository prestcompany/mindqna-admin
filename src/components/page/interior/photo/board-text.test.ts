import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exampleText, FIT_SCALES, fitText, type Measure } from './board-text';

// 글자마다 너비 = 글자 크기
const measure: Measure = (text, size) => Array.from(text).length * size;

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

test('the shrink steps are 0.9ⁿ and end at exactly 0.5', () => {
  assert.equal(FIT_SCALES[0], 1);
  close(FIT_SCALES[1], 0.9);
  close(FIT_SCALES[6], 0.531441);
  assert.equal(FIT_SCALES[FIT_SCALES.length - 1], 0.5);
  assert.equal(FIT_SCALES.length, 8);
});

test('example text fills max length across max lines with the sample syllables', () => {
  assert.equal(exampleText(20, 3), '가나다라마바사\n가나다라마바사\n가나다라마바');
  assert.equal(exampleText(5, 3), '가나\n다라\n마');
  assert.equal(exampleText(3, 1), '가나다');
  // 나머지는 앞줄부터 하나씩 — 최대 줄 수를 다 채운다
  assert.equal(exampleText(5, 4), '가나\n다\n라\n마');
  assert.equal(exampleText(2, 3), '가\n나');
});

test('text that fits keeps the font size', () => {
  const r = fitText({ text: '가나다', fontSize: 10, width: 100, height: 40, maxLines: 3, measure });
  assert.deepEqual(r, { fontSize: 10, lines: ['가나다'], truncated: false });
});

test('explicit line breaks stay', () => {
  const r = fitText({ text: '가\n나', fontSize: 10, width: 100, height: 40, maxLines: 3, measure });
  assert.deepEqual(r.lines, ['가', '나']);
});

test('latin words wrap at spaces; hangul wraps between syllables', () => {
  assert.deepEqual(fitText({ text: 'ab cd', fontSize: 10, width: 30, height: 100, maxLines: 3, measure }).lines, [
    'ab',
    'cd',
  ]);
  assert.deepEqual(fitText({ text: '가나다라', fontSize: 10, width: 30, height: 100, maxLines: 3, measure }).lines, [
    '가나다',
    '라',
  ]);
});

test('too many lines shrinks step by step until the lines fit', () => {
  // 10px: 5자/줄 → 3줄, 9px: 5자/줄 → 3줄, 8.1px: 6자/줄 → 2줄
  const r = fitText({ text: '가'.repeat(12), fontSize: 10, width: 50, height: 100, maxLines: 2, measure });
  close(r.fontSize, 8.1);
  assert.deepEqual(r.lines, ['가'.repeat(6), '가'.repeat(6)]);
  assert.equal(r.truncated, false);
});

test('a block taller than the slot shrinks, with a 0.5px tolerance', () => {
  // 줄 높이 25 → 22.5 → 20.25(≤ 20 + 0.5)
  const r = fitText({ text: '가나', fontSize: 20, width: 1000, height: 20, maxLines: 3, measure });
  close(r.fontSize, 16.2);
});

test('still overflowing at half size cuts at max lines and ends with an ellipsis', () => {
  // 5px: 10자/줄 → 4줄 > 2
  const r = fitText({ text: '가'.repeat(40), fontSize: 10, width: 50, height: 1000, maxLines: 2, measure });
  assert.equal(r.fontSize, 5);
  assert.deepEqual(r.lines, ['가'.repeat(10), `${'가'.repeat(9)}…`]);
  assert.equal(r.truncated, true);
});

test('a wrapped word keeps the space before the next word', () => {
  // aaaaa 가 aaaa / a 로 쪼개진 뒤 b 가 같은 줄에 오되 사이 공백이 남는다
  assert.deepEqual(fitText({ text: 'xx aaaaa b', fontSize: 10, width: 40, height: 100, maxLines: 5, measure }).lines, [
    'xx',
    'aaaa',
    'a b',
  ]);
});

test('closing punctuation does not start a line', () => {
  assert.deepEqual(fitText({ text: '가나.', fontSize: 10, width: 20, height: 100, maxLines: 3, measure }).lines, [
    '가',
    '나.',
  ]);
});

test('a broken config with zero max lines does not throw', () => {
  assert.doesNotThrow(() => fitText({ text: '가나', fontSize: 10, width: 100, height: 100, maxLines: 0, measure }));
});

test('still too tall at half size keeps only the lines that fit the slot height (app boardEllipsisLines)', () => {
  // 0.5배 = 10px, 줄 높이 12.5, 3줄 37.5 > 20.5 → floor(20.5 ÷ 12.5) = 1줄
  const r = fitText({ text: '가\n나\n다', fontSize: 20, width: 1000, height: 20, maxLines: 3, measure });
  assert.equal(r.fontSize, 10);
  assert.deepEqual(r.lines, ['가…']);
  assert.equal(r.truncated, true);
});

test('the kept line count never drops below one', () => {
  const r = fitText({ text: '가\n나', fontSize: 100, width: 1000, height: 10, maxLines: 3, measure });
  assert.deepEqual(r.lines, ['가…']);
});
