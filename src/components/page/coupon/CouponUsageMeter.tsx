type Props = {
  used: number;
  /** 0 means unlimited — there is no progress against an unbounded target. */
  capacity: number;
};

function CouponUsageMeter({ used, capacity }: Props) {
  const isUnlimited = capacity === 0;
  // capacity is schema-bound to >= 0, so once isUnlimited is false, capacity > 0 always.
  const ratio = isUnlimited ? 0 : Math.min(1, used / capacity);

  return (
    <div className='space-y-1'>
      <div className='tabular-nums text-slate-900'>
        {used}
        <span className='text-slate-500'> / {isUnlimited ? '무제한' : capacity}</span>
      </div>
      {!isUnlimited && (
        <div
          className='h-0.5 w-full overflow-hidden rounded-full bg-border'
          role='progressbar'
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={capacity}
        >
          <div className='h-full bg-slate-900' style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export default CouponUsageMeter;
