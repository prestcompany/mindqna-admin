import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  change?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, className = '' }) => {
  return (
    <Card className={className}>
      <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        {change && (
          <p className='text-xs text-muted-foreground'>
            <span className={change.isPositive !== false ? 'text-green-500' : 'text-red-500'}>{change.value}</span>
            {change.label && ` ${change.label}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
