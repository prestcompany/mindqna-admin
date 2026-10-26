import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COMMON_SNACK_TYPE,
  EVOLUTION_SNACK_TYPE_OPTIONS,
  snackTypeSchema,
  toSnackApiType,
  toSnackFormType,
  DEFAULT_SNACK_EXP,
} from './snack-form-values';

test('new snack defaults to common type and 0.5 experience', () => {
  assert.equal(toSnackFormType(null), COMMON_SNACK_TYPE);
  assert.equal(DEFAULT_SNACK_EXP, 0.5);
  assert.equal(toSnackApiType(COMMON_SNACK_TYPE), null);
});

test('existing valid evolution type remains selected and saves unchanged', () => {
  assert.equal(toSnackFormType('cat'), 'cat');
  assert.equal(toSnackApiType(snackTypeSchema.parse('cat')), 'cat');
});

test('snack type choices contain common and exactly eight evolution types', () => {
  assert.equal(EVOLUTION_SNACK_TYPE_OPTIONS.length, 8);
  assert.deepEqual(EVOLUTION_SNACK_TYPE_OPTIONS.map(({ value }) => value), [
    'dog', 'cat', 'rebbit', 'squirrel', 'bear', 'hamster', 'chick', 'penguin',
  ]);
});

test('legacy deer and pig values require reselection before saving', () => {
  for (const value of ['deer', 'pig']) {
    assert.equal(toSnackFormType(value as 'deer' | 'pig'), value);
    assert.equal(snackTypeSchema.safeParse(value).success, false);
  }
  assert.equal(snackTypeSchema.safeParse(COMMON_SNACK_TYPE).success, true);
});
