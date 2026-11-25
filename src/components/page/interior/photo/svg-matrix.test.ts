import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apply, IDENTITY, type Matrix, multiply, parseTransform } from './svg-matrix';

const near = (actual: number[], expected: number[], eps = 1e-9) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) <= eps, `${actual} ≉ ${expected}`));
};

const parsed = (value: string): Matrix => {
  const m = parseTransform(value);
  assert.ok(m, `${value} should parse`);
  return m;
};

test('translate with ty omitted', () => {
  const m = parsed('translate(10)');
  assert.equal(m[4], 10);
  assert.equal(m[5], 0);
});

test('rotate around a center', () => {
  near(apply(parsed('rotate(90 50 50)'), 100, 50), [50, 100]);
});

test('matrix', () => {
  assert.deepEqual(parsed('matrix(1 0 0 1 5 6)'), [1, 0, 0, 1, 5, 6]);
  assert.deepEqual(parsed('matrix(1,0,0,1,5,6)'), [1, 0, 0, 1, 5, 6]);
});

test('a list multiplies from the left', () => {
  near(apply(parsed('translate(10,0) scale(2)'), 1, 1), [12, 2]);
  near(apply(parsed('scale(2) translate(10,0)'), 1, 1), [22, 2]);
  near(apply(parsed('translate(10, 0),scale(2, 3)'), 1, 1), [12, 3]);
});

test('skewX and skewY', () => {
  near([parsed('skewX(30)')[2]], [Math.tan(Math.PI / 6)]);
  near([parsed('skewY(30)')[1]], [Math.tan(Math.PI / 6)]);
});

test('numbers with exponents and signs', () => {
  near(parsed('translate(-1e1 +.5)'), [1, 0, 0, 1, -10, 0.5]);
});

test('empty is identity', () => {
  assert.deepEqual(parseTransform(''), IDENTITY);
  assert.deepEqual(parseTransform('  '), IDENTITY);
});

test('bad syntax is null', () => {
  assert.equal(parseTransform('rotate('), null);
  assert.equal(parseTransform('rotate(10 20)'), null);
  assert.equal(parseTransform('matrix(1 0 0 1 5)'), null);
  assert.equal(parseTransform('translate(a)'), null);
  assert.equal(parseTransform('perspective(10)'), null);
  assert.equal(parseTransform('translate(10) junk'), null);
  assert.equal(parseTransform('translate()'), null);
});

test('multiply applies the right matrix first', () => {
  const t: Matrix = [1, 0, 0, 1, 10, 0];
  const s: Matrix = [2, 0, 0, 2, 0, 0];
  near(apply(multiply(t, s), 1, 1), [12, 2]);
  assert.deepEqual(multiply(IDENTITY, t), t);
});
