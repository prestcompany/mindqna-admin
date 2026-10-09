import type { AdminPushItem } from '@/client/push';
import { badgeVariants, type BadgeProps } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { describePushTarget, type PushTargetKind } from './services/push-target-display';

/** Category, not status: a soft tag per kind so the column can be scanned by color. */
const BADGE_VARIANT: Record<PushTargetKind, BadgeProps['variant']> = {
  ALL: 'softInfo',
  FILTER: 'tonePink',
  LEGACY: 'tonePink',
  USER: 'softNeutral',
};

/**
 * One line — badge, locale, headcount — that never wraps. The conditions or names behind a
 * send open from the badge on hover or keyboard focus, as a card rather than inline text.
 * Rendered inside DataTable, whose TooltipProvider this relies on.
 */
export default function PushTargetCell({ item, parts = 1 }: { item: AdminPushItem; parts?: number }) {
  const { kind, badge, summary, card } = describePushTarget(item, parts);
  const tag = (
    <span className={cn(badgeVariants({ variant: BADGE_VARIANT[kind] }), 'gap-1')}>
      {badge}
      {card && <Info className='h-3 w-3 opacity-70' aria-hidden />}
    </span>
  );

  return (
    <div className='flex min-w-0 items-center gap-2 whitespace-nowrap'>
      {card ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type='button'
              aria-label={`${card.title} 상세`}
              className='shrink-0 cursor-help rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              {tag}
            </button>
          </TooltipTrigger>
          <TooltipContent
            side='bottom'
            align='start'
            className='w-64 border border-border bg-popover p-3 text-popover-foreground shadow-md'
          >
            <p className='mb-2 text-xs font-semibold text-foreground'>{card.title}</p>
            <dl className='space-y-1.5 text-xs'>
              {card.rows.map((row) => (
                <div key={row.label} className='flex items-start justify-between gap-4'>
                  <dt className='shrink-0 text-muted-foreground'>{row.label}</dt>
                  <dd className='break-words text-right text-foreground'>{row.value}</dd>
                </div>
              ))}
            </dl>
            {card.footnote && (
              <p className='mt-2 border-t border-border pt-2 text-[11px] tabular-nums text-muted-foreground'>
                {card.footnote}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className='shrink-0'>{tag}</span>
      )}
      <span className='min-w-0 truncate text-sm tabular-nums text-foreground'>{summary || '—'}</span>
    </div>
  );
}
