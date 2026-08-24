import type { ReactNode } from 'react';

/**
 * Label column left, control column right. Every control then starts and ends on the same
 * two vertical lines, which is what makes a settings surface read as aligned — labels
 * stacked above their fields leave each row starting at a different place.
 */
export function DefinitionRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className='grid grid-cols-[140px_minmax(0,1fr)] items-start gap-4 border-b border-border px-4 py-2.5 last:border-b-0'>
      <div className='pt-1.5'>
        <div className='text-sm font-medium text-muted-foreground'>{label}</div>
        {hint && <div className='mt-0.5 text-xs leading-snug text-muted-foreground'>{hint}</div>}
      </div>
      <div className='min-w-0 text-sm'>{children}</div>
    </div>
  );
}

/**
 * Opens a group of rows. The band ranks above the labels it introduces by SIZE (15px vs
 * 14px) and weight, not by a tinted strip.
 *
 * It used to be a full-width `bg-muted` band, because at the time every role in the panel
 * — band, label, value — was `text-sm`, and a semibold/medium weight difference at 13px
 * Korean is close to invisible. The fill was doing the work the type could not. With the
 * type scale pinned to DESIGN.md's steps the band sits a real step above its labels, so
 * the fill is redundant and the panel loses two horizontal rules per section.
 */
export function PanelBand({ title }: { title: string }) {
  return (
    <div className='border-t border-border px-4 pb-2 pt-5 first:border-t-0 first:pt-3'>
      <div className='text-base font-semibold text-foreground'>{title}</div>
    </div>
  );
}
