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
    <section className={cn('mb-5 w-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm', className)}>
      {(title || description) && (
        <div className='border-b border-border/70 px-5 py-4'>
          {title ? <h3 className='text-base font-semibold tracking-tight text-foreground'>{title}</h3> : null}
          {description ? <p className='mt-1 text-sm text-muted-foreground'>{description}</p> : null}
        </div>
      )}

      <div className='px-5 py-4'>{children}</div>
    </section>
  );
};

export default React.memo(FormSection);
