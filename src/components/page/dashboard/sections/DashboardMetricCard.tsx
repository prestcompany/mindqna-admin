import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DashboardMetricCardValue } from '../types/growth';
import AnimatedMetricValue from './AnimatedMetricValue';

const toneClassName: Record<DashboardMetricCardValue['tone'], string> = {
  slate: 'border-slate-200 bg-slate-50/70 text-slate-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
};

interface DashboardMetricCardProps {
  metric: DashboardMetricCardValue;
}

function DashboardMetricCard({ metric }: DashboardMetricCardProps) {
  return (
    <Card className='border-slate-200/80 bg-white shadow-sm'>
      <CardContent className='flex flex-col gap-4 p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-1'>
            <p className='text-sm font-medium text-slate-600'>{metric.label}</p>
            <AnimatedMetricValue value={metric.value} className='text-2xl font-semibold tracking-tight tabular-nums text-slate-950' />
          </div>
          <Badge variant='outline' className={cn('rounded-full px-2 py-1 text-[11px] font-medium', toneClassName[metric.tone])}>
            {metric.accentLabel}
          </Badge>
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-slate-500'>{metric.deltaLabel}</span>
          <span className='font-medium text-slate-900'>{metric.deltaText}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardMetricCard;
