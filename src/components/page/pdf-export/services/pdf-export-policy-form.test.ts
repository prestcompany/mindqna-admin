import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_PDF_EXPORT_POLICY_FORM,
  pdfExportPolicyError,
  toPdfExportPolicyForm,
  toUpdatePdfExportPolicyParams,
} from './pdf-export-policy-form';

const starForm = {
  currency: 'STAR' as const,
  coinPerQuestion: 2,
  heartPerQuestion: 80,
  maxDownloadCount: 20,
  expiryDays: 30,
};

test('a loaded policy becomes the form without the id or timestamp', () => {
  const form = toPdfExportPolicyForm({ id: 1, ...starForm, currency: 'HEART', updatedAt: null });
  assert.deepEqual(form, { ...starForm, currency: 'HEART' });
});

test('the empty form starts on STAR with zeroed prices', () => {
  assert.equal(EMPTY_PDF_EXPORT_POLICY_FORM.currency, 'STAR');
  assert.equal(EMPTY_PDF_EXPORT_POLICY_FORM.heartPerQuestion, 0);
});

test('a complete STAR form is valid', () => {
  assert.equal(pdfExportPolicyError(starForm), null);
});

test('the star price is required even when HEART is selected (older apps pay it)', () => {
  const error = pdfExportPolicyError({ ...starForm, currency: 'HEART', coinPerQuestion: 0 });
  assert.match(error ?? '', /스타/);
});

test('the heart price is required only when HEART is selected', () => {
  assert.equal(pdfExportPolicyError({ ...starForm, heartPerQuestion: 0 }), null);
  const error = pdfExportPolicyError({ ...starForm, currency: 'HEART', heartPerQuestion: 0 });
  assert.match(error ?? '', /하트/);
});

test('download count and expiry stay required positive integers', () => {
  assert.ok(pdfExportPolicyError({ ...starForm, maxDownloadCount: 0 }));
  assert.ok(pdfExportPolicyError({ ...starForm, expiryDays: 1.5 }));
});

test('a STAR save with an empty heart price omits it so the server floor (>= 1) does not reject the save', () => {
  const params = toUpdatePdfExportPolicyParams({ ...starForm, heartPerQuestion: 0 });
  assert.equal('heartPerQuestion' in params, false);
  assert.equal(params.currency, 'STAR');
  assert.equal(params.coinPerQuestion, 2);
});

test('a STAR save with a filled heart price keeps it for a later switch', () => {
  const params = toUpdatePdfExportPolicyParams(starForm);
  assert.equal(params.heartPerQuestion, 80);
});

test('a HEART save sends both prices and the currency', () => {
  const params = toUpdatePdfExportPolicyParams({ ...starForm, currency: 'HEART', heartPerQuestion: 120 });
  assert.deepEqual(params, {
    currency: 'HEART',
    coinPerQuestion: 2,
    heartPerQuestion: 120,
    maxDownloadCount: 20,
    expiryDays: 30,
  });
});
