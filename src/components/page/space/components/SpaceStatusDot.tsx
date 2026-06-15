import { cn } from '@/lib/utils';

interface SpaceStatusDotProps {
  active?: boolean;
  className?: string;
}

function SpaceStatusDot({ active, className }: SpaceStatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          active ? 'bg-emerald-500' : 'bg-muted-foreground/40',
        )}
        aria-hidden
      />
      <span className={active ? 'text-emerald-700' : 'text-muted-foreground'}>
        {active ? 'Active' : 'Inactive'}
      </span>
    </span>
  );
}

export default SpaceStatusDot;
