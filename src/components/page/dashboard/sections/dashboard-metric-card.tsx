import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DashboardMetricCardValue } from '../types/growth';
import AnimatedMetricValue from './animated-metric-value';

const toneClassName: Record<DashboardMetricCardValue['tone'], string> = {
  slate: 'border-border bg-canvas/70 text-foreground',
  emerald: 'border-success/25 bg-success/10 text-success',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
  amber: 'border-warning/35 bg-warning/15 text-warning-foreground',
};

interface DashboardMetricCardProps {
  metric: DashboardMetricCardValue;
}

function DashboardMetricCard({ metric }: DashboardMetricCardProps) {
  return (
    <Card className='border-border bg-white'>
      <CardContent className='flex flex-col gap-4 p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='space-y-1'>
            <p className='text-sm font-medium text-muted-foreground'>{metric.label}</p>
            <AnimatedMetricValue
              value={metric.value}
              className='text-2xl font-semibold tracking-tight tabular-nums text-foreground'
            />
          </div>
          <Badge
            variant='outline'
            className={cn('rounded-full px-2 py-1 text-xs font-medium', toneClassName[metric.tone])}
          >
            {metric.accentLabel}
          </Badge>
        </div>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>{metric.deltaLabel}</span>
          <span className='font-medium text-foreground'>{metric.deltaText}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardMetricCard;
