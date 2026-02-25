import { cn } from '@/lib/utils';
import React, { PropsWithChildren } from 'react';

interface IDefaultTableBtnProps {
  className?: string;
}

const DefaultTableBtn = ({ children, className }: PropsWithChildren<IDefaultTableBtnProps>) => {
  return (
    <div
      className={cn(
        'mb-4 flex w-full flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-card p-4 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
};

export default React.memo(DefaultTableBtn);
