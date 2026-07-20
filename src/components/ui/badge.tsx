import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-electric text-white',
        secondary:
          'border-transparent bg-mid-gray text-gray-200',
        destructive:
          'border-transparent bg-red-500 text-white',
        outline:
          'text-white border border-border',
        success:
          'border-transparent bg-green-500/20 text-green-400',
        warning:
          'border-transparent bg-yellow-500/20 text-yellow-400',
        premium:
          'border-transparent bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
