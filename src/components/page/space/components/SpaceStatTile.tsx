import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SpaceStatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** 값에 적용할 Tailwind 텍스트 색 클래스. 미지정 시 기본 전경색 */
  accent?: string;
}

function SpaceStatTile({ label, value, sub, accent }: SpaceStatTileProps) {
  return (
    <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
      <div className='text-sm font-medium text-slate-600'>{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums', accent ?? 'text-slate-950')}>
        {value}
      </div>
      {sub ? <div className='mt-0.5 text-xs text-slate-500'>{sub}</div> : null}
    </div>
  );
}

export default SpaceStatTile;
