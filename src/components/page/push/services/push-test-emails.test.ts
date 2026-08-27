import assert from 'node:assert/strict';
import test from 'node:test';

import { parseEmails, reachableCount } from '../PushTestSendPanel';

test('splits however the list was pasted', () => {
  // Out of Slack, a spreadsheet column, or typed by hand — all of these arrive.
  assert.deepEqual(parseEmails('a@x.com, b@x.com\nc@x.com;d@x.com  e@x.com'), [
    'a@x.com',
    'b@x.com',
    'c@x.com',
    'd@x.com',
    'e@x.com',
  ]);
});

test('the same address twice is one address', () => {
  assert.deepEqual(parseEmails('A@x.com\n a@X.COM '), ['a@x.com']);
});

test('an empty paste is no addresses, not one blank one', () => {
  assert.deepEqual(parseEmails('   \n , ; '), []);
});

const result = (recipients: Array<{ hasToken: boolean }>) =>
  ({
    resolved: [{ email: 'a@x.com', recipients: recipients as any }],
    unmatched: [],
    userNames: recipients.map((_, i) => `u${i}`),
  }) as any;

test('an account with no device is not counted as reached', () => {
  // It is still in userNames — the send targets it — but nothing arrives, and the number
  // beside the button is what the operator checks their phone against.
  assert.equal(reachableCount(result([{ hasToken: true }, { hasToken: false }])), 1);
});

test('nobody reachable reads as zero rather than as the account count', () => {
  assert.equal(reachableCount(result([{ hasToken: false }])), 0);
});
