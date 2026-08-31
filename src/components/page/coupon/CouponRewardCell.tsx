import { Heart, Star, Ticket } from 'lucide-react';

type Props = {
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

/**
 * One line, always. Stacking heart / star / ticket as separate blocks grew the row to
 * ~56px with two rewards and ~76px with three, against DESIGN.md's ~36px table row — so
 * a list mixed row heights and lost its vertical rhythm. The ticket clause drops to
 * {typography.caption} to keep the coin amount the thing the eye lands on.
 */
function CouponRewardCell({ heart, star, ticketCount, ticketDueDayNum }: Props) {
  const hasCoin = heart > 0 || star > 0;

  if (!hasCoin && ticketCount === 0) {
    return <span className='text-muted-foreground'>—</span>;
  }

  return (
    <div className='flex min-w-0 items-center gap-2'>
      {heart > 0 && (
        <span className='flex shrink-0 items-center gap-1'>
          <Heart className='h-3.5 w-3.5 text-destructive' aria-label='하트' />
          <span className='tabular-nums text-foreground'>{heart}</span>
        </span>
      )}
      {star > 0 && (
        <span className='flex shrink-0 items-center gap-1'>
          <Star className='h-3.5 w-3.5 text-warning-foreground' aria-label='스타' />
          <span className='tabular-nums text-foreground'>{star}</span>
        </span>
      )}
      {ticketCount > 0 && (
        <span className='flex min-w-0 items-center gap-1 text-xs text-muted-foreground'>
          {hasCoin && <span className='text-faint'>·</span>}
          <Ticket className='h-3.5 w-3.5 shrink-0 text-muted-foreground' aria-label='프리미엄 티켓' />
          <span className='truncate tabular-nums'>
            {ticketCount} · {ticketDueDayNum > 0 ? `${ticketDueDayNum}일` : '평생'}
          </span>
        </span>
      )}
    </div>
  );
}

export default CouponRewardCell;
