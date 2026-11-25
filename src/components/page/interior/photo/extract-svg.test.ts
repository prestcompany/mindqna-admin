import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkSvgText } from './extract-svg';

const PLAIN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="420" height="200" viewBox="0 0 420 200"><rect id="slot-a" x="21" y="40" width="105" height="120"/></svg>';

test('a file over 1MB is rejected', () => {
  assert.equal(checkSvgText(1_048_577, PLAIN), '칸 레이어만 켜고 다시 내보내 주세요');
  assert.equal(checkSvgText(1_048_576, PLAIN), null);
});

test('DOCTYPE and ENTITY are rejected', () => {
  assert.notEqual(checkSvgText(100, `<!DOCTYPE svg>${PLAIN}`), null);
  assert.notEqual(checkSvgText(100, `<?xml version="1.0"?><!doctype svg [<!ENTITY x "y">]>${PLAIN}`), null);
  assert.notEqual(checkSvgText(100, `<!ENTITY x "y">${PLAIN}`), null);
});

test('a plain svg passes', () => {
  assert.equal(checkSvgText(PLAIN.length, PLAIN), null);
});
