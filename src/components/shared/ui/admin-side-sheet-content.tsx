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
  /**
   * Pass `overflow-hidden p-0` when the child owns the scroll/footer split — a form's
   * action bar depends on the form's own state (submitting, create vs edit), so it stays
   * inside the form rather than being handed up to this shell.
   */
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
      // The panel itself never scrolls — the body row does, so the header and the action
      // bar stay put without `sticky` and without competing for the same scroll context.
      className={cn(
        'overflow-hidden border-l bg-card p-0 shadow-floating',
        ADMIN_SIDE_SHEET_SIZE_CLASS[size],
        className,
      )}
      {...props}
    >
      <div className='grid h-full grid-rows-[auto_1fr]'>
        <SheetHeader className='border-b bg-card px-6 py-3 text-left'>
          <SheetTitle className='pr-8 text-lg font-semibold tracking-heading'>{title}</SheetTitle>
          {description ? <SheetDescription className='pr-8 text-xs'>{description}</SheetDescription> : null}
        </SheetHeader>
        {/* Canvas ground, per DESIGN.md §Surface: white cards float on #fafafa. On a white
            body their only separation was the 1px hairline, which reads as stacked boxes. */}
        <div className={cn('min-h-0 overflow-y-auto bg-canvas px-6 py-4', bodyClassName)}>{children}</div>
      </div>
    </SheetContent>
  );
}

export default AdminSideSheetContent;
export type { AdminSideSheetSize, AdminSideSheetContentProps };
