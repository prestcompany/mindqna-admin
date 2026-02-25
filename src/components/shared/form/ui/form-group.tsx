import React, { PropsWithChildren } from 'react';

interface IFormGroupProps {
  title?: string;
  description?: string;
  className?: string;
}

const FormGroup = ({ title, description, className, children }: PropsWithChildren<IFormGroupProps>) => {
  return (
    <div className={`grid gap-3 py-3 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-start ${className ?? ''}`}>
      <div className='space-y-1 pt-1'>
        {title ? <div className='text-sm font-medium text-foreground'>{title}</div> : null}
        {description ? <div className='text-xs text-muted-foreground'>{description}</div> : null}
      </div>
      <div className='min-w-0'>{children}</div>
    </div>
  );
};

export default React.memo(FormGroup);
