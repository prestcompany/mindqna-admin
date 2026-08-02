import { cn } from '@/lib/utils';
import React, { PropsWithChildren } from 'react';

interface IFormSectionProps {
  title?: string;
  description?: string;
  className?: string;
}

const FormSection = ({
  title,
  description,
  className,
  children,
}: PropsWithChildren<IFormSectionProps>) => {
  return (
    <section className={cn('mb-6 w-full overflow-hidden rounded-lg border border-border bg-card', className)}>
      {(title || description) && (
        <div className='border-b border-border px-6 py-4'>
          {title ? <h3 className='text-base font-semibold tracking-heading text-foreground'>{title}</h3> : null}
          {description ? <p className='mt-1 text-sm text-muted-foreground'>{description}</p> : null}
        </div>
      )}

      <div className='px-6 py-4'>{children}</div>
    </section>
  );
};

export default React.memo(FormSection);
