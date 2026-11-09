import assert from 'node:assert/strict';
import { test } from 'node:test';
import { containRect, FURNITURE_CELL, photoWarnings } from './preview-math';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('containRect fits the frame inside the furniture box and centres it', () => {
  const wide = containRect({ w: 154, h: 69 }, { w: 420, h: 200 });
  close(wide.h, 69);
  close(wide.w, 144.9);
  close(wide.x, (154 - 144.9) / 2);
  close(wide.y, 0);

  const tall = containRect({ w: 100, h: 100 }, { w: 50, h: 200 });
  close(tall.w, 25);
  close(tall.x, 37.5);

  const same = containRect({ w: 80, h: 40 }, { w: 400, h: 200 });
  assert.deepEqual(same, { x: 0, y: 0, w: 80, h: 40 });
});

test('a furniture cell is a seventh of a 360px screen and two thirds as tall', () => {
  close(FURNITURE_CELL.w, 360 / 7);
  close(FURNITURE_CELL.h, 360 / 7 / 1.5);
});

test('photoWarnings flags ratio, overlay size and stale imports', () => {
  const base = { width: 420, height: 200 };
  assert.deepEqual(photoWarnings({ base, representative: base, overlay: base, importedFor: base }), []);
  const out = photoWarnings({
    base,
    representative: { width: 400, height: 200 },
    overlay: { width: 421, height: 200 },
    importedFor: { width: 300, height: 200 },
  });
  assert.equal(out.length, 3);
  assert.deepEqual(photoWarnings({ base: null, representative: { width: 1, height: 9 } }), []);
  // 같은 비율이면 크기가 달라도 대표 그림 경고는 없다.
  assert.deepEqual(photoWarnings({ base, representative: { width: 840, height: 400 } }), []);
});
