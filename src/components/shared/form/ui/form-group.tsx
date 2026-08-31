import React, { PropsWithChildren } from 'react';

interface IFormGroupProps {
  title?: string;
  description?: string;
  className?: string;
}

const FormGroup = ({ title, description, className, children }: PropsWithChildren<IFormGroupProps>) => {
  return (
    // `@2xl` (672px) measures the enclosing FormSection, not the viewport. A `lg:` here
    // split the row into two columns on any wide screen — including inside a 600px sheet,
    // where a fixed 12rem label column left the input roughly 300px.
    <div className={`grid gap-3 py-3 @2xl:grid-cols-[11rem_minmax(0,1fr)] @2xl:items-start ${className ?? ''}`}>
      <div className='space-y-1 pt-1'>
        {title ? <div className='text-sm font-medium text-foreground'>{title}</div> : null}
        {description ? <div className='text-xs text-muted-foreground'>{description}</div> : null}
      </div>
      <div className='min-w-0'>{children}</div>
    </div>
  );
};

export default React.memo(FormGroup);
