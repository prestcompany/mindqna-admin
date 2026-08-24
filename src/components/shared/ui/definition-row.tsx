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
      <div className='pt-1.5 text-sm font-medium text-muted-foreground'>{label}</div>
      <div className='min-w-0 text-sm'>
        {children}
        {hint && <div className='mt-1.5 text-xs leading-snug text-muted-foreground'>{hint}</div>}
      </div>
    </div>
  );
}

/**
 * Opens a group of rows. Two devices, doing two different jobs:
 *
 *   the tinted strip GROUPS  — it draws the boundary between one set of rows and the next
 *   the caption RANKS        — 15px/600 ink, a real step above the 14px labels it introduces
 *
 * Both are needed. A quiet caption on a strip was tried and it inverts the hierarchy: the
 * section header ends up smaller and lighter than its own contents, and it collides with
 * the hint, which is also 12px muted. A big caption with no strip loses the boundary and
 * has to shout to replace it. Grouping and ranking are separate problems; solve each with
 * the device that fits it.
 */
export function PanelBand({ title }: { title: string }) {
  return (
    <div className='border-b border-t border-border bg-muted px-4 py-2 first:border-t-0'>
      <div className='text-base font-semibold text-foreground'>{title}</div>
    </div>
  );
}
