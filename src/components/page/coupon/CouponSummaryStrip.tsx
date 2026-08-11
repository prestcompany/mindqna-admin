import type { CouponSummary } from '@/client/coupon';

type Tile = {
  key: keyof CouponSummary;
  label: string;
  hint?: string;
};

/**
 * Answers "what needs me right now" before the list does. The counts are whole-table and
 * deliberately ignore the current search and status filter — a strip that moved with the
 * filters would agree with the list while disagreeing with reality.
 */
const TILES: Tile[] = [
  { key: 'active', label: '진행중' },
  { key: 'endingSoon', label: '7일 내 종료' },
  { key: 'nearlyExhausted', label: '소진 임박', hint: '80% 이상' },
  { key: 'usedToday', label: '오늘 사용' },
];

function CouponSummaryStrip({ summary, isLoading }: { summary?: CouponSummary; isLoading?: boolean }) {
  return (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
      {TILES.map((tile) => (
        <div key={tile.key} className='rounded-lg border border-border bg-card px-4 py-3'>
          <div className='text-xs text-slate-600'>
            {tile.label}
            {tile.hint && <span className='ml-1 text-slate-400'>{tile.hint}</span>}
          </div>
          <div className='mt-0.5 text-2xl font-semibold tabular-nums tracking-heading text-slate-900'>
            {isLoading || !summary ? (
              <span className='inline-block h-6 w-10 rounded bg-muted align-middle' />
            ) : (
              summary[tile.key]
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CouponSummaryStrip;
