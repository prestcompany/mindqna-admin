import { computeProgress } from './services/push-progress';

type Props = {
  sentCount: number;
  failedCount: number;
  targetCount: number | null;
  isApproximate: boolean;
};

function PushProgressMeter({ sentCount, failedCount, targetCount, isApproximate }: Props) {
  const { ratio, percent } = computeProgress({ sentCount, failedCount, targetCount });

  return (
    <div className='space-y-1'>
      <div className='tabular-nums text-foreground'>
        {sentCount.toLocaleString()}
        <span className='text-muted-foreground'>
          {' / '}
          {targetCount === null ? '-' : `${isApproximate ? '약 ' : ''}${targetCount.toLocaleString()}`}
          {percent !== null && ` · ${percent}%`}
        </span>
        {/* Failures are their own number. Folding them into the percentage is what made a
            partial delivery read as a complete one. */}
        {failedCount > 0 && (
          <span className='ml-1.5 text-destructive'>실패 {failedCount.toLocaleString()}</span>
        )}
      </div>
      {ratio !== null && (
        // Bounded width, matching CouponUsageMeter: a full-cell bar reads as an input underline.
        <div
          className='h-1 w-20 overflow-hidden rounded-full bg-border'
          role='progressbar'
          aria-label={`발송 ${sentCount} / ${targetCount ?? 0}`}
          aria-valuenow={sentCount}
          aria-valuemin={0}
          aria-valuemax={targetCount ?? 0}
        >
          <div className='h-full bg-foreground' style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  );
}

export default PushProgressMeter;
