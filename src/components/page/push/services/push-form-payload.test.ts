import assert from 'node:assert/strict';
import test from 'node:test';

import { parseUserNamesInput, pushUrlError, toCreatePushParams } from './push-form-payload';

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
  filter: {},
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

// A malformed imgUrl reaches FCM as notification.imageUrl and fails every send in the batch
// with messaging/invalid-argument, so the form has to refuse it before the request goes out.
test('pushUrlError rejects an imgUrl that is a relative path', () => {
  assert.match(pushUrlError({ ...base, imgUrl: 'banner.png' }) ?? '', /이미지 URL/);
  assert.match(pushUrlError({ ...base, imgUrl: '/assets/banner.png' }) ?? '', /이미지 URL/);
});

test('pushUrlError rejects an imgUrl containing a space', () => {
  assert.match(pushUrlError({ ...base, imgUrl: 'https://cdn.example.com/my banner.png' }) ?? '', /이미지 URL/);
});

test('pushUrlError rejects a non-http imgUrl, since FCM fetches the image itself', () => {
  assert.match(pushUrlError({ ...base, imgUrl: 'mindqna://push/42' }) ?? '', /이미지 URL/);
});

test('pushUrlError accepts an https imgUrl', () => {
  assert.equal(pushUrlError({ ...base, imgUrl: 'https://cdn.example.com/banner.png' }), null);
});

test('pushUrlError rejects a scheme-less link', () => {
  assert.match(pushUrlError({ ...base, link: 'push/42' }) ?? '', /링크/);
  assert.match(pushUrlError({ ...base, link: 'https://example.com/a b' }) ?? '', /링크/);
});

// Every other push in the product deep-links as mindqna://<path>, so the app's own format
// has to stay sendable — only http(s) would reject it.
test('pushUrlError accepts an https link and the mindqna:// deep link', () => {
  assert.equal(pushUrlError({ ...base, link: 'https://example.com/promo' }), null);
  assert.equal(pushUrlError({ ...base, link: 'mindqna://push/42' }), null);
});

test('pushUrlError leaves both optional — empty stays valid', () => {
  assert.equal(pushUrlError({ link: '', imgUrl: '' }), null);
  assert.equal(pushUrlError({ link: '  ', imgUrl: '  ' }), null);
});

test('an unfiltered broadcast sends no filter rather than an empty object', () => {
  // An empty object would reach the server as a filter, and the server refuses one — the
  // absence has to survive the payload builder.
  assert.equal(toCreatePushParams(base).filter, undefined);
});

test('a broadcast carries its conditions', () => {
  const dto = toCreatePushParams({ ...base, filter: { spaceTypes: ['couple'], minPetLevel: 5 } });
  assert.deepEqual(dto.filter, { spaceTypes: ['couple'], minPetLevel: 5 });
});

test('a zero question minimum is a real condition, not an unset field', () => {
  // 0 is falsy; treating it as unset would widen a narrow campaign to the whole locale.
  const dto = toCreatePushParams({ ...base, filter: { minCardCount: 0 } });
  assert.deepEqual(dto.filter, { minCardCount: 0 });
});

test('a per-user send drops conditions it cannot use', () => {
  const dto = toCreatePushParams({
    ...base,
    target: 'USER',
    userNames: 'alice, bob',
    filter: { spaceTypes: ['couple'] },
  });
  assert.equal(dto.filter, undefined);
  assert.deepEqual(dto.userNames, ['alice', 'bob']);
});
