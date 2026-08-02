import React from 'react';
import { IPageHeader } from './default-layout';

interface IPageHeaderProps {
  value: IPageHeader;
}

const PageHeader = ({ value }: IPageHeaderProps) => {
  return (
    <div className='px-4 pb-1 pt-6 sm:px-8'>
      <div className='mx-auto flex w-full max-w-[1600px] items-center justify-between rounded-lg border border-border bg-card px-6 py-4'>
        <div className='min-w-0'>
          <h1 className='truncate text-2xl font-semibold tracking-display text-foreground'>{value.title}</h1>
          {value.description && <p className='mt-1 text-sm text-muted-foreground'>{value.description}</p>}
        </div>
        {value.actions && <div className='flex items-center gap-2'>{value.actions}</div>}
      </div>
    </div>
  );
};

export default React.memo(PageHeader);
