import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  customPetTypeSchema,
  getCustomPetTypeLabel,
  petTypeOptions,
  toCustomApiPetType,
  toCustomFormPetType,
} from './constants';

test('custom pet types offer all and the eight evolvable types', () => {
  assert.deepEqual(petTypeOptions.map(({ value }) => value), [
    'null', 'dog', 'cat', 'rebbit', 'squirrel', 'bear', 'hamster', 'chick', 'penguin',
  ]);
});

test('a saved all-pet template remains all-pet when reopened and saved', () => {
  assert.equal(toCustomFormPetType(null), 'null');
  assert.equal(toCustomApiPetType(toCustomFormPetType(null)), null);
  assert.equal(getCustomPetTypeLabel(null), '전체');
});

test('legacy deer and pig remain identifiable but require reselection', () => {
  assert.equal(getCustomPetTypeLabel('deer'), '사슴');
  assert.equal(getCustomPetTypeLabel('pig'), '돼지');
  assert.equal(customPetTypeSchema.safeParse('deer').success, false);
  assert.equal(customPetTypeSchema.safeParse('pig').success, false);
  assert.equal(customPetTypeSchema.safeParse('null').success, true);
});
