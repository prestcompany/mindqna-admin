import assert from 'node:assert/strict';
import test from 'node:test';

import { parseUserNamesInput, toCreatePushParams } from './push-form-payload';

const base = {
  sendMode: 'now' as const,
  pushAt: '',
  target: 'ALL' as const,
  locale: 'ko',
  userNames: '',
  title: '공지',
  message: '내용',
  link: '',
  imgUrl: '',
};

test('an immediate broadcast sends sendNow and omits pushAt', () => {
  const dto = toCreatePushParams(base);
  assert.equal(dto.sendNow, true);
  assert.equal(dto.pushAt, undefined);
  assert.equal(dto.locale, 'ko');
  assert.equal(dto.userNames, undefined);
});

test('a scheduled broadcast sends an ISO pushAt', () => {
  const dto = toCreatePushParams({ ...base, sendMode: 'schedule', pushAt: '2026-08-25T10:00' });
  assert.equal(dto.sendNow, false);
  assert.equal(dto.pushAt, new Date('2026-08-25T10:00').toISOString());
});

test('a per-user send drops locale, because the server ignores it', () => {
  const dto = toCreatePushParams({ ...base, target: 'USER', userNames: 'alice, bob' });
  assert.equal(dto.locale, undefined);
  assert.deepEqual(dto.userNames, ['alice', 'bob']);
});

test('empty optional strings become undefined rather than empty strings', () => {
  const dto = toCreatePushParams({ ...base, link: '  ', imgUrl: '' });
  assert.equal(dto.link, undefined);
  assert.equal(dto.imgUrl, undefined);
});

test('link and imgUrl are trimmed and passed through when present', () => {
  const dto = toCreatePushParams({ ...base, link: ' https://a.example ', imgUrl: 'https://b.example' });
  assert.equal(dto.link, 'https://a.example');
  assert.equal(dto.imgUrl, 'https://b.example');
});

test('parseUserNamesInput trims, drops blanks and de-duplicates', () => {
  assert.deepEqual(parseUserNamesInput('alice, bob ,,alice,'), ['alice', 'bob']);
  assert.deepEqual(parseUserNamesInput('   '), []);
});
