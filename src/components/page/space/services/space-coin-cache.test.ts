import assert from 'node:assert/strict';
import test from 'node:test';

import { refreshSpaceCoinMutationCaches } from './space-coin-cache';

test('refreshes list data and invalidates space detail caches after coin mutation', async () => {
  const invalidatedQueries: unknown[] = [];
  let reloadCount = 0;

  await refreshSpaceCoinMutationCaches({
    spaceId: 'space-123',
    queryClient: {
      invalidateQueries: async (filters: unknown) => {
        invalidatedQueries.push(filters);
      },
    },
    reload: async () => {
      reloadCount += 1;
    },
  });

  assert.equal(reloadCount, 1);
  assert.deepEqual(invalidatedQueries, [
    { queryKey: ['space-search-detail', 'space-123'] },
    { queryKey: ['space-detail', 'space-123'] },
  ]);
});
