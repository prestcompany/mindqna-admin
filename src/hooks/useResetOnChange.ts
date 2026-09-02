import { useState } from 'react';

/**
 * Runs `reset` during render whenever any value in `deps` changes.
 *
 * This is React's "adjusting state when a prop changes" pattern. The effect it
 * replaces set state from inside useEffect, which renders once with the stale
 * value before correcting it; doing the comparison during render means the
 * child never sees the stale render at all.
 *
 * `reset` is called while rendering, so it may only set state — no fetching,
 * no subscriptions, no DOM work.
 */
export function useResetOnChange(deps: readonly unknown[], reset: () => void) {
  const [prev, setPrev] = useState(deps);

  if (prev.length !== deps.length || prev.some((value, i) => !Object.is(value, deps[i]))) {
    setPrev(deps);
    reset();
  }
}
