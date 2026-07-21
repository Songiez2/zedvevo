import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  onClose: () => void
  duration?: number
}

const icons = { success: CheckCircle, error: XCircle, info: Info, warning: AlertTriangle }
const colors = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-danger/30 bg-danger/10 text-danger',
  info: 'border-brand/30 bg-brand/10 text-brand',
  warning: 'border-warning/30 bg-warning/10 text-warning',
}

export default function Toast({ message, type = 'info', onClose, duration = 4000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const Icon = icons[type]
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 32 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl max-w-sm ${colors[type]}`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onClose} className="p-0.5 hover:opacity-70 transition-opacity">
        <X size={14} />
      </button>
    </motion.div>
  )
}

// Toast container
interface ToastItem { id: string; message: string; type?: Props['type'] }
interface ToastContainerProps { toasts: ToastItem[]; removeToast: (id: string) => void }

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-28 right-4 z-[60] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />)}
      </AnimatePresence>
    </div>
  )
}
