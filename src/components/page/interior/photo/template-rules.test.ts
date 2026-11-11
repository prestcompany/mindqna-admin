import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PhotoFeatureConfig } from '@/client/types';
import {
  FEATURE_LABEL,
  featureFilterOf,
  featureTabFromQuery,
  featureTemplateProblems,
  OPEN_FEATURES,
  ratioDiff,
  toTemplateBody,
} from './template-rules';

test('feature furniture must be a paid item or an event', () => {
  assert.deepEqual(featureTemplateProblems({ feature: 'none', type: 'wall', price: 0 }), []);
  assert.deepEqual(featureTemplateProblems({ feature: 'photo', type: 'item', price: 10 }), []);
  assert.deepEqual(featureTemplateProblems({ feature: 'photo', type: 'event', price: 0 }), []);
  assert.equal(featureTemplateProblems({ feature: 'photo', type: 'item', price: 0 }).length, 1);
  assert.equal(featureTemplateProblems({ feature: 'photo', type: 'wall', price: 10 }).length, 1);
});

test('create sends feature and config; update never sends feature, and none never sends config', () => {
  const config: PhotoFeatureConfig = { version: 1, baseImgId: 1, imgWidth: 420, imgHeight: 200, slots: [] };
  assert.deepEqual(toTemplateBody({ mode: 'create', feature: 'photo', config }), {
    feature: 'photo',
    featureConfig: config,
  });
  assert.deepEqual(toTemplateBody({ mode: 'create', feature: 'none', config: null }), { feature: 'none' });
  assert.deepEqual(toTemplateBody({ mode: 'update', feature: 'photo', config }), { featureConfig: config });
  assert.deepEqual(toTemplateBody({ mode: 'update', feature: 'none', config: null }), {});
});

test('ratioDiff', () => {
  assert.equal(ratioDiff({ width: 420, height: 200 }, { width: 840, height: 400 }), 0);
  assert.ok(ratioDiff({ width: 420, height: 200 }, { width: 400, height: 200 }) > 0.01);
});

test('labels and open features', () => {
  assert.deepEqual(FEATURE_LABEL, { none: '없음', photo: '사진', board: '칠판', message: '쪽지' });
  assert.deepEqual(OPEN_FEATURES, ['none', 'photo']);
});

test('the feature tab reads the open features from the address', () => {
  assert.equal(featureTabFromQuery('photo'), 'photo');
  assert.equal(featureTabFromQuery('none'), 'none');
});

test('the feature tab falls back to all for a missing, closed or repeated value', () => {
  assert.equal(featureTabFromQuery(undefined), 'all');
  assert.equal(featureTabFromQuery('board'), 'all');
  assert.equal(featureTabFromQuery(['photo', 'none']), 'all');
});

test('the feature tab sends no filter for all and one feature otherwise', () => {
  assert.equal(featureFilterOf('all'), undefined);
  assert.deepEqual(featureFilterOf('photo'), ['photo']);
  assert.deepEqual(featureFilterOf('none'), ['none']);
});
