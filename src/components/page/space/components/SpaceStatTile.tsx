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
    <div className='rounded-xl bg-muted/40 px-4 py-3'>
      <div className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>{label}</div>
      <div className={cn('mt-1 text-2xl font-semibold leading-tight tabular-nums', accent ?? 'text-foreground')}>
        {value}
      </div>
      {sub ? <div className='mt-0.5 text-xs text-muted-foreground'>{sub}</div> : null}
    </div>
  );
}

export default SpaceStatTile;
