import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md border px-2.5 py-0.5 text-xs font-semibold leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-success text-success-foreground shadow hover:bg-success/90",
        warning:
          "border-transparent bg-warning text-warning-foreground shadow hover:bg-warning/90",
        info:
          "border-transparent bg-info text-info-foreground shadow hover:bg-info/90",
        muted:
          "border-transparent bg-muted text-muted-foreground",
        softNeutral:
          "border-border bg-muted/60 text-foreground/80 font-medium",
        softSuccess:
          "border-emerald-200 bg-emerald-50 text-emerald-700 font-medium",
        softWarning:
          "border-amber-200 bg-amber-50 text-amber-700 font-medium",
        softDanger:
          "border-rose-200 bg-rose-50 text-rose-700 font-medium",
        softInfo:
          "border-blue-200 bg-blue-50 text-blue-700 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
