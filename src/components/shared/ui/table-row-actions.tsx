import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';

export type TableRowActionItem = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

type TableRowActionsProps = {
  items: TableRowActionItem[];
  align?: 'start' | 'center' | 'end';
  triggerLabel?: string;
};

function TableRowActions({ items, align = 'end', triggerLabel = '행 작업 열기' }: TableRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='w-8 h-8'
          aria-label={triggerLabel}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className='w-4 h-4' />
          <span className='sr-only'>{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            disabled={item.disabled}
            className={cn(item.destructive && 'text-destructive focus:text-destructive')}
            onClick={(event) => {
              event.stopPropagation();
              item.onClick();
            }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TableRowActions;
