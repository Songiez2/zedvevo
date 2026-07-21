import { Music } from 'lucide-react'
import { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title?: string
  description?: string
}

export default function EmptyState({ icon, title = 'No content available yet', description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-bg-card border border-border flex items-center justify-center mb-4">
        {icon || <Music size={28} className="text-text-muted" />}
      </div>
      <h3 className="text-base font-semibold text-text-secondary">{title}</h3>
      {description && <p className="text-sm text-text-muted mt-1 max-w-xs">{description}</p>}
    </div>
  )
}
