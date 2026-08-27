import { useState } from 'react';

/** Show this many before folding the rest behind a toggle. */
const PREVIEW = 12;

/**
 * The people a per-user send went to.
 *
 * They used to be joined with commas into a single line, which is fine for the three
 * usernames someone types by hand and unreadable for the ten a staff test resolves to or the
 * two thousand a campaign chunk carries. A wrapped run-on also gives no way to tell whether a
 * particular person was in the list, which is the only question anyone opens this view to ask.
 */
export default function PushRecipientList({ userNames }: { userNames: string[] }) {
  const [expanded, setExpanded] = useState(false);

  if (userNames.length === 0) return <span className='text-muted-foreground'>없음</span>;

  const shown = expanded ? userNames : userNames.slice(0, PREVIEW);
  const hidden = userNames.length - shown.length;

  return (
    <div className='space-y-2'>
      <div className='max-h-56 overflow-y-auto rounded-lg border border-border p-2'>
        <ul className='grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3'>
          {shown.map((name) => (
            <li key={name} className='truncate font-mono text-xs text-foreground'>
              {name}
            </li>
          ))}
        </ul>
      </div>
      {hidden > 0 && (
        <button
          type='button'
          className='text-sm text-muted-foreground underline-offset-2 hover:underline'
          onClick={() => setExpanded(true)}
        >
          {hidden.toLocaleString()}명 더 보기
        </button>
      )}
      {expanded && userNames.length > PREVIEW && (
        <button
          type='button'
          className='text-sm text-muted-foreground underline-offset-2 hover:underline'
          onClick={() => setExpanded(false)}
        >
          접기
        </button>
      )}
    </div>
  );
}
