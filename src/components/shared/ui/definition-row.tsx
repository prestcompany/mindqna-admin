import type { ReactNode } from 'react';

/**
 * Label column left, control column right. Every control then starts and ends on the same
 * two vertical lines, which is what makes a settings surface read as aligned — labels
 * stacked above their fields leave each row starting at a different place.
 *
 * The hint belongs UNDER THE CONTROL, not under the label. Reading order is
 * "what → type it → (if stuck) how", so the help sits where the eye already is; the same
 * reason FormMessage renders there. Putting it in the 140px label column also wrapped a
 * 30-character Korean sentence to three lines — Korean does not hyphenate, so it broke
 * mid-word — and that made the row's height depend on the hint rather than the control,
 * leaving the control floating at the top of a tall, half-empty row.
 */
export function DefinitionRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className='grid grid-cols-[140px_minmax(0,1fr)] items-start gap-4 border-b border-border px-4 py-2.5 last:border-b-0'>
      <div className='pt-1.5 text-sm font-medium text-foreground'>{label}</div>
      <div className='min-w-0 text-sm'>
        {children}
        {hint && <div className='mt-1.5 text-xs leading-snug text-muted-foreground'>{hint}</div>}
      </div>
    </div>
  );
}

/**
 * Opens a group of rows. The tinted strip carries the structural signal; the caption only
 * has to name the group, so it stays quiet — small, medium weight, muted.
 *
 * Getting this backwards is easy. Drop the strip and the caption has to grow and darken to
 * do the strip's job, at which point it competes with the sheet title above it and with the
 * field labels below it. The strip is cheap and the caption stays out of the way.
 */
export function PanelBand({ title }: { title: string }) {
  return (
    <div className='border-b border-t border-border bg-muted px-4 py-2 first:border-t-0'>
      <div className='text-xs font-medium text-muted-foreground'>{title}</div>
    </div>
  );
}
