import assert from 'node:assert/strict';
import test from 'node:test';

import client from './@base';
import { transferUser } from './user';

test('sends login transfer params to the admin user transfer endpoint', async () => {
  const originalPost = client.post;
  const calls: unknown[][] = [];

  client.post = (async (...args: unknown[]) => {
    calls.push(args);

    return { data: { ok: true } };
  }) as typeof client.post;

  try {
    const params = {
      oldUserName: 'old-user-code',
      newUserName: 'new-user-code',
    };

    await transferUser(params);

    assert.deepEqual(calls, [['/user/transfer', params]]);
  } finally {
    client.post = originalPost;
  }
});
