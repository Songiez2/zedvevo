interface Props {
  count?: number
  className?: string
  variant?: 'track' | 'card' | 'grid'
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-bg-card animate-pulse rounded-xl ${className}`} />
}

export default function Skeleton({ count = 6, className = '', variant = 'card' }: Props) {
  if (variant === 'track') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <SkeletonBlock className="w-8 h-8" />
            <SkeletonBlock className="w-9 h-9 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <SkeletonBlock className="h-3 w-3/4" />
              <SkeletonBlock className="h-2.5 w-1/2" />
            </div>
            <SkeletonBlock className="w-8 h-3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBlock className="aspect-square w-full" />
          <SkeletonBlock className="h-3 w-3/4" />
          <SkeletonBlock className="h-2.5 w-1/2" />
        </div>
      ))}
    </div>
  )
}
