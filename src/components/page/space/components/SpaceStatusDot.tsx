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
          active ? 'bg-emerald-500' : 'bg-slate-300',
        )}
        aria-hidden
      />
      <span className={active ? 'text-emerald-700' : 'text-slate-500'}>
        {active ? 'Active' : 'Inactive'}
      </span>
    </span>
  );
}

export default SpaceStatusDot;
