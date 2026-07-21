import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Loader2 } from 'lucide-react'
import { initiatePayment } from '@/db/api'
import { formatCurrency } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: (paymentId: string) => void
  onFail?: (error?: string) => void
  amount: number
  contentType: string
  contentId?: string
  description: string
}

export default function PaymentModal({ isOpen, onClose, onSuccess, onFail, amount, contentType, contentId, description }: Props) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePay = async () => {
    setError('')
    if (!phone.match(/^(0[79]\d{8}|260[79]\d{8})$/)) {
      setError('Enter a valid Zambian mobile number (e.g. 0971234567)')
      return
    }
    setLoading(true)
    try {
      const result = await initiatePayment({ amount, phone_number: phone, content_type: contentType, content_id: contentId, description })
      if (result.success && result.payment_id) {
        onSuccess(result.payment_id)
      } else {
        const msg = result.error || 'Payment initiation failed. Please try again.'
        setError(msg)
        onFail?.(msg)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-bg-card border border-border rounded-2xl p-6 w-full max-w-sm z-10"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Complete Payment</h2>
                <p className="text-sm text-text-muted mt-1">{description}</p>
              </div>
              <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-bg-secondary rounded-xl p-4 mb-5">
              <p className="text-xs text-text-muted">Amount</p>
              <p className="text-3xl font-bold text-brand mt-1">{formatCurrency(amount)}</p>
              <p className="text-xs text-text-muted mt-1">Powered by Lipila</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">Mobile Money Number</label>
              <div className="flex items-center gap-2 bg-bg-secondary border border-border rounded-xl px-3 py-2.5 focus-within:border-brand transition-colors">
                <Phone size={16} className="text-text-muted flex-shrink-0" />
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="0971234567"
                  className="bg-transparent text-text-primary text-sm flex-1 outline-none placeholder:text-text-muted"
                />
              </div>
              <p className="text-xs text-text-muted mt-1">Airtel Money or MTN MoMo</p>
              {error && <p className="text-xs text-danger mt-1">{error}</p>}
            </div>

            <button
              onClick={handlePay} disabled={loading || !phone}
              className="w-full py-3 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Processing…' : `Pay ${formatCurrency(amount)}`}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
