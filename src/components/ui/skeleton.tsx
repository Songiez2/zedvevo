import { cn } from '@/utils'

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gradient-to-r from-mid-gray via-dark-gray to-mid-gray bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
