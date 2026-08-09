import { Heart, Star, Ticket } from 'lucide-react';

type Props = {
  heart: number;
  star: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

function CouponRewardCell({ heart, star, ticketCount, ticketDueDayNum }: Props) {
  const hasCoin = heart > 0 || star > 0;

  return (
    <div className='space-y-0.5'>
      {hasCoin && (
        <div className='flex items-center gap-1.5'>
          {heart > 0 ? (
            <Heart className='h-3.5 w-3.5 text-rose-600' aria-label='하트' />
          ) : (
            <Star className='h-3.5 w-3.5 text-amber-600' aria-label='스타' />
          )}
          <span className='tabular-nums text-slate-900'>{heart > 0 ? heart : star}</span>
        </div>
      )}
      {ticketCount > 0 && (
        <div className='flex items-center gap-1.5 text-slate-600'>
          <Ticket className='h-3.5 w-3.5 text-slate-500' aria-label='프리미엄 티켓' />
          <span className='tabular-nums'>{ticketCount}</span>
          <span>· {ticketDueDayNum > 0 ? `${ticketDueDayNum}일` : '평생'}</span>
        </div>
      )}
      {!hasCoin && ticketCount === 0 && <span className='text-slate-500'>—</span>}
    </div>
  );
}

export default CouponRewardCell;
