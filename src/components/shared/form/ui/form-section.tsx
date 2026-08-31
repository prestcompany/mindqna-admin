import { cn } from '@/lib/utils';
import React, { PropsWithChildren } from 'react';

interface IFormSectionProps {
  /** ReactNode so a section can carry a state badge beside its name. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}

const FormSection = ({ title, description, className, children }: PropsWithChildren<IFormSectionProps>) => {
  return (
    // `@container` makes this section the reference for FormGroup's column split.
    // No outer margin: every consumer already sets its own `space-y`, so `mb-6` only
    // compounded with it — 24px + 16px between sections and a stray 24px after the last.
    <section className={cn('@container w-full overflow-hidden rounded-lg border border-border bg-card', className)}>
      {(title || description) && (
        <div className='border-b border-border px-4 py-3'>
          {/* Label tier, not heading: the sheet title above it owns {typography.heading}.
              These were both 16px/600, which left the panel title looking subordinate. */}
          {title ? <h3 className='text-sm font-medium text-foreground'>{title}</h3> : null}
          {description ? <p className='mt-1 text-xs text-muted-foreground'>{description}</p> : null}
        </div>
      )}

      {/* 16px inner padding, not 24px — the sheet body already contributes 24px a side. */}
      <div className='px-4 py-3'>{children}</div>
    </section>
  );
};

export default React.memo(FormSection);
