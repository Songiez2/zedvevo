import { useContext } from 'react'
import { ToastContext, ToastContextValue } from '@/contexts/ToastContext'

export function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToastContext must be used inside ToastProvider')
  return ctx
}
