import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xs font-semibold leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/90',
        warning: 'border-transparent bg-warning text-warning-foreground hover:bg-warning/90',
        info: 'border-transparent bg-info text-info-foreground hover:bg-info/90',
        muted: 'border-transparent bg-muted text-muted-foreground',
        softNeutral: 'border-border bg-canvas text-muted-foreground font-medium',
        softSuccess: 'border-success/25 bg-success/10 text-success font-medium',
        softWarning: 'border-warning/35 bg-warning/15 text-warning-foreground font-medium',
        softDanger: 'border-destructive/25 bg-destructive/10 text-destructive font-medium',
        softInfo: 'border-sky-200 bg-sky-50 text-sky-700 font-medium',
        tonePink: 'border-pink-200 bg-pink-50 text-pink-700 font-medium',
        dotNeutral:
          "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-foreground before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-slate-400 before:content-['']",
        dotSuccess:
          "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-foreground before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-success before:content-['']",
        dotWarning:
          "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-foreground before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-warning before:content-['']",
        dotDanger:
          "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-foreground before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-destructive before:content-['']",
        dotInfo:
          "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-foreground before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-sky-500 before:content-['']",
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
