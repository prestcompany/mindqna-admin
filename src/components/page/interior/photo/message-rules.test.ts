import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  exampleMessage,
  MESSAGE_DEFAULT,
  MESSAGE_LAYOUT,
  messageConfigProblems,
  messageLayout,
  paperWarnings,
  parseMessageNumber,
  readMessageConfig,
} from './message-rules';

const ok = { paper: { id: 1, uri: 'u' }, paperWidth: 300, paperHeight: 356, maxLength: 80, maxLines: 7 };

test('defaults follow the request: 80 characters, 7 lines', () => {
  assert.deepEqual(MESSAGE_DEFAULT, { maxLength: 80, maxLines: 7 });
});

test('a complete message config has no problems', () => {
  assert.deepEqual(messageConfigProblems(ok), []);
});

test('the paper image is required, must be re-picked when its address is gone, and needs a size', () => {
  assert.deepEqual(messageConfigProblems({ ...ok, paper: null }), ['편지지 그림을 고르세요.']);
  assert.deepEqual(messageConfigProblems({ ...ok, paper: { id: 1, uri: null } }), ['편지지 그림을 다시 고르세요.']);
  assert.deepEqual(messageConfigProblems({ ...ok, paperWidth: 0, paperHeight: 0 }), [
    '편지지 그림 크기를 읽지 못했습니다.',
  ]);
});

test('maxLength is an integer 1-200 and maxLines an integer 1-20', () => {
  const lengthProblem = '최대 글자 수는 1–200 정수여야 합니다';
  const linesProblem = '최대 줄 수는 1–20 정수여야 합니다';
  for (const maxLength of [1, 200]) assert.deepEqual(messageConfigProblems({ ...ok, maxLength }), []);
  for (const maxLength of [0, 201, 20.5]) assert.deepEqual(messageConfigProblems({ ...ok, maxLength }), [lengthProblem]);
  for (const maxLines of [1, 20]) assert.deepEqual(messageConfigProblems({ ...ok, maxLines }), []);
  for (const maxLines of [0, 21, 2.5]) assert.deepEqual(messageConfigProblems({ ...ok, maxLines }), [linesProblem]);
});

test('the paper ratio warns when it is more than 5% off 300:356', () => {
  assert.deepEqual(paperWarnings({ width: 600, height: 712 }), []);
  // 300 / (356 * 1.049) -> 4.7% off
  assert.deepEqual(paperWarnings({ width: 300, height: 373 }), []);
  assert.equal(paperWarnings({ width: 300, height: 376 }).length, 1);
  assert.deepEqual(paperWarnings(null), []);
});

test('the layout ratios are the Figma numbers on a 300x356 paper', () => {
  assert.equal(MESSAGE_LAYOUT.text.x, 25.5 / 300);
  assert.equal(MESSAGE_LAYOUT.text.y, 40 / 356);
  assert.equal(MESSAGE_LAYOUT.text.width, 249 / 300);
  assert.equal(MESSAGE_LAYOUT.text.height, 240 / 356);
  assert.equal(MESSAGE_LAYOUT.sign.y, 292 / 356);
  assert.equal(MESSAGE_LAYOUT.sign.height, 32 / 356);
});

test('messageLayout scales the boxes and the 25px font to the paper image', () => {
  const at300 = messageLayout({ width: 300, height: 356 });
  assert.deepEqual(at300.text, { x: 25.5, y: 40, width: 249, height: 240 });
  assert.deepEqual(at300.sign, { x: 25.5, y: 292, width: 249, height: 32 });
  assert.equal(at300.fontSize, 25);
  const at600 = messageLayout({ width: 600, height: 712 });
  assert.deepEqual(at600.text, { x: 51, y: 80, width: 498, height: 480 });
  assert.equal(at600.fontSize, 50);
});

test('the example message fills maxLength over maxLines with 가나다라마', () => {
  assert.equal(exampleMessage(12, 3), '가나다라\n마가나다\n라마가나');
  assert.equal(exampleMessage(5, 7), '가\n나\n다\n라\n마');
  assert.equal(exampleMessage(7, 2), '가나다라\n마가나');
});

test('number inputs round to an integer and clamp into range', () => {
  assert.equal(parseMessageNumber('80', 1, 200), 80);
  assert.equal(parseMessageNumber('7.6', 1, 20), 8);
  assert.equal(parseMessageNumber('0', 1, 200), 1);
  assert.equal(parseMessageNumber('999', 1, 200), 200);
  assert.equal(parseMessageNumber('abc', 1, 200), null);
  assert.equal(parseMessageNumber('', 1, 200), null);
});

test('a saved message config is read only when the paper id and both sizes are there', () => {
  const saved = { version: 1, paperImgId: 7, paperWidth: 300, paperHeight: 356, maxLength: 80, maxLines: 7 };
  assert.deepEqual(readMessageConfig('message', saved), saved);
  assert.equal(readMessageConfig('board', saved), null);
  assert.equal(readMessageConfig('message', null), null);
  assert.equal(readMessageConfig('message', { ...saved, paperWidth: undefined }), null);
  assert.equal(readMessageConfig('message', { ...saved, paperHeight: 0 }), null);
  assert.equal(readMessageConfig('message', { ...saved, paperImgId: '7' }), null);
});

test('an off-ratio paper scales the boxes per axis and the font by width (app SpaceMessageReader)', () => {
  const l = messageLayout({ width: 300, height: 400 });
  assert.ok(Math.abs(l.text.y - (40 / 356) * 400) < 1e-9);
  assert.ok(Math.abs(l.text.height - (240 / 356) * 400) < 1e-9);
  assert.equal(l.text.width, 249);
  assert.ok(Math.abs(l.sign.y - (292 / 356) * 400) < 1e-9);
  assert.equal(l.fontSize, 25);
});
