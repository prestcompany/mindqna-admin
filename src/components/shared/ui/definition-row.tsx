import type { ReactNode } from 'react';

/**
 * Label column left, control column right. Every control then starts and ends on the same
 * two vertical lines, which is what makes a settings surface read as aligned — labels
 * stacked above their fields leave each row starting at a different place.
 */
export function DefinitionRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className='grid grid-cols-[140px_minmax(0,1fr)] items-start gap-4 border-b border-border px-4 py-2.5 last:border-b-0'>
      <div className='pt-1.5'>
        <div className='text-sm font-medium text-foreground'>{label}</div>
        {hint && <div className='mt-0.5 text-xs leading-snug text-muted-foreground'>{hint}</div>}
      </div>
      <div className='min-w-0 text-sm'>{children}</div>
    </div>
  );
}

/**
 * Opens a group of rows. The band — a full-width tinted strip — carries the structural
 * signal; the type only has to sit one weight above the field labels it introduces.
 *
 * Deliberately not the mono uppercase eyebrow DESIGN.md defines for section labels. That
 * device draws its weight from capitals and tracking, and Korean has no capitals, so a
 * Korean eyebrow reads as nothing but the smallest text on the panel — below the labels
 * it is supposed to rank above.
 */
export function PanelBand({ title }: { title: string }) {
  return (
    <div className='border-b border-t border-border bg-muted/40 px-4 py-2 first:border-t-0'>
      <div className='text-sm font-semibold text-foreground'>{title}</div>
    </div>
  );
}
