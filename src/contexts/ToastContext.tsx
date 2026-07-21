import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import Toast from '@/components/ui/Toast'

interface ToastItem {
  id: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

export interface ToastContextValue {
  addToast: (message: string, type?: ToastItem['type'], duration?: number) => void
}

// exported so useToastContext.ts can reference it — not a component
// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ToastContextValue | null>(null)

// Re-exported here so any import path resolves correctly
// eslint-disable-next-line react-refresh/only-export-components
export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used inside ToastProvider')
  return ctx
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info', duration = 5000) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type, duration }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-28 right-4 z-[90] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <Toast
                message={t.message}
                type={t.type}
                onClose={() => removeToast(t.id)}
                duration={t.duration}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
