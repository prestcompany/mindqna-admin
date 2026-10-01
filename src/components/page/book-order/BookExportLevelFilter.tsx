import type { BookOrderLevel } from '@/client/types';
import { cn } from '@/lib/utils';
import { BOOK_ORDER_LEVEL_LABEL } from './BookExportStatusBadge';

type LevelFilterValue = 'all' | BookOrderLevel;

// Same dot colors as the dotSuccess/dotWarning/dotDanger badge variants (ui/badge.tsx),
// so the tile's status signal reads consistently with the table's status column.
const DOT_CLASS: Record<BookOrderLevel, string> = {
  ok: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
};

const TILES: { key: LevelFilterValue; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'ok', label: BOOK_ORDER_LEVEL_LABEL.ok },
  { key: 'warning', label: BOOK_ORDER_LEVEL_LABEL.warning },
  { key: 'error', label: BOOK_ORDER_LEVEL_LABEL.error },
];

type Props = {
  counts: Record<LevelFilterValue, number>;
  value: LevelFilterValue;
  onChange: (value: LevelFilterValue) => void;
};

function BookExportLevelFilter({ counts, value, onChange }: Props) {
  return (
    <div className='grid grid-cols-4 gap-3'>
      {TILES.map((tile) => {
        const count = counts[tile.key];
        const selected = value === tile.key;
        const isEmpty = count === 0;
        return (
          <button
            key={tile.key}
            type='button'
            aria-pressed={selected}
            onClick={() => onChange(tile.key)}
            className={cn(
              'rounded-lg border border-hairline bg-card p-4 text-left transition-colors duration-fast hover:bg-canvas focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              selected && 'border-ink',
            )}
          >
            <span className='flex items-center gap-1.5 text-sm font-medium tracking-label text-body'>
              {tile.key !== 'all' ? <span className={cn('h-1.5 w-1.5 rounded-full', DOT_CLASS[tile.key])} /> : null}
              {tile.label}
            </span>
            <span
              className={cn(
                'mt-1 block text-2xl font-semibold tracking-display tabular-nums',
                isEmpty ? 'text-body' : 'text-ink',
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default BookExportLevelFilter;
