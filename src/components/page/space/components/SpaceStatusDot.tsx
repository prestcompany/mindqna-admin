import { cn } from '@/lib/utils';

interface SpaceStatusDotProps {
  active?: boolean | null;
  className?: string;
}

function SpaceStatusDot({ active, className }: SpaceStatusDotProps) {
  // active가 명시적으로 true/false일 때만 단정하고, 누락(undefined/null)이면 '미상'으로 표기한다.
  // (예: /space/search 응답에 isActive가 없으면 모두 Inactive로 잘못 보이던 문제 방지)
  const isUnknown = active == null;
  const label = isUnknown ? '미상' : active ? 'Active' : 'Inactive';

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)}>
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isUnknown ? 'bg-slate-300' : active ? 'bg-emerald-500' : 'bg-slate-400',
        )}
        aria-hidden
      />
      <span className={isUnknown ? 'text-slate-500' : active ? 'text-emerald-700' : 'text-slate-600'}>
        {label}
      </span>
    </span>
  );
}

export default SpaceStatusDot;
