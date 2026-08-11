type Props = {
  used: number;
  /** 0 means unlimited — there is no progress against an unbounded target. */
  capacity: number;
};

/** Matches `nearlyExhausted` in the summary query, so the tile and the rows agree. */
const NEARLY_FULL = 0.8;

function CouponUsageMeter({ used, capacity }: Props) {
  const isUnlimited = capacity === 0;
  // capacity is schema-bound to >= 0, so once isUnlimited is false, capacity > 0 always.
  const ratio = isUnlimited ? null : Math.min(1, used / capacity);
  const isNearlyFull = ratio !== null && ratio >= NEARLY_FULL && ratio < 1;

  return (
    <div className='space-y-1'>
      <div className='tabular-nums text-slate-900'>
        {used}
        <span className='text-slate-500'>
          {' / '}
          {isUnlimited ? '무제한' : capacity}
          {/* The percentage is what makes 1/1 and 312/500 read differently at a glance. */}
          {ratio !== null && ` · ${Math.round(ratio * 100)}%`}
        </span>
        {/* Text, not just a colour: DESIGN.md forbids signalling by colour alone. */}
        {isNearlyFull && <span className='ml-1.5 text-xs font-medium text-amber-700'>임박</span>}
      </div>
      {!isUnlimited && (
        // Bounded width, not the full cell: a 100% bar spanning the column reads as an
        // input underline rather than a meter.
        <div
          className='h-1 w-20 overflow-hidden rounded-full bg-border'
          role='progressbar'
          aria-label={`사용 ${used} / ${capacity}`}
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={capacity}
        >
          <div
            className={`h-full ${isNearlyFull ? 'bg-amber-500' : 'bg-slate-900'}`}
            style={{ width: `${(ratio ?? 0) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default CouponUsageMeter;
