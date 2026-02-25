import React from 'react';
import { IPageHeader } from './default-layout';

interface IPageHeaderProps {
  value: IPageHeader;
}

const PageHeader = ({ value }: IPageHeaderProps) => {
  return (
    <div className='px-5 pt-6 pb-4 sm:px-6 border-b border-border'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight text-foreground'>{value.title}</h1>
          {value.description && (
            <p className='mt-1 text-sm text-muted-foreground'>{value.description}</p>
          )}
        </div>
        {value.actions && <div className='flex items-center gap-2'>{value.actions}</div>}
      </div>
    </div>
  );
};

export default React.memo(PageHeader);
