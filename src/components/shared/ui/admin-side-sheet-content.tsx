import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import React from 'react';

type AdminSideSheetSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const ADMIN_SIDE_SHEET_SIZE_CLASS: Record<AdminSideSheetSize, string> = {
  sm: 'w-[calc(100vw-1rem)] sm:w-[520px] sm:max-w-[520px]',
  md: 'w-[calc(100vw-1rem)] sm:w-[600px] sm:max-w-[600px]',
  lg: 'w-[calc(100vw-1rem)] sm:w-[720px] sm:max-w-[720px]',
  xl: 'w-[calc(100vw-1rem)] lg:w-[1200px] lg:max-w-[1200px]',
  full: 'w-[calc(100vw-1rem)] sm:w-[95vw] sm:max-w-[95vw]',
};

interface AdminSideSheetContentProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: AdminSideSheetSize;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}

function AdminSideSheetContent({
  title,
  description,
  size = 'md',
  className,
  bodyClassName,
  children,
  ...props
}: AdminSideSheetContentProps) {
  return (
    <SheetContent
      side='right'
      className={cn(
        'overflow-y-auto border-l bg-background p-0 shadow-xl',
        ADMIN_SIDE_SHEET_SIZE_CLASS[size],
        className,
      )}
      {...props}
    >
      <div className='flex min-h-full flex-col'>
        <SheetHeader className='sticky top-0 z-20 border-b bg-background/95 px-6 py-4 text-left backdrop-blur supports-[backdrop-filter]:bg-background/80'>
          <SheetTitle className='pr-8 text-base font-semibold tracking-tight'>{title}</SheetTitle>
          {description ? <SheetDescription className='pr-8'>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className={cn('flex-1 px-6 py-5', bodyClassName)}>{children}</div>
      </div>
    </SheetContent>
  );
}

export default AdminSideSheetContent;
export type { AdminSideSheetSize, AdminSideSheetContentProps };
