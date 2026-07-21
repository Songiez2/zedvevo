interface Props {
  label: string
  progress: number // 0-100
  done?: boolean
  error?: string
}

export default function UploadProgress({ label, progress, done, error }: Props) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary truncate max-w-[70%]">{label}</span>
        <span className={`text-xs font-medium ${error ? 'text-danger' : done ? 'text-success' : 'text-brand'}`}>
          {error ? 'Failed' : done ? 'Done' : `${progress}%`}
        </span>
      </div>
      <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${error ? 'bg-danger' : done ? 'bg-success' : 'bg-brand'}`}
          style={{ width: `${error ? 100 : progress}%` }}
        />
      </div>
    </div>
  )
}
