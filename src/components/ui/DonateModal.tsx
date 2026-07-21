import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Heart, Loader2, Check } from 'lucide-react'
import { createDonation } from '@/db/api'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'

interface Props { isOpen: boolean; onClose: () => void }

const PRESETS = [10, 20, 50, 100]

export default function DonateModal({ isOpen, onClose }: Props) {
  const { profile } = useAuth()
  const [amount, setAmount] = useState<number | ''>('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleDonate = async () => {
    setError('')
    const amt = Number(amount)
    if (!amt || amt < 1) { setError('Enter an amount (minimum K1)'); return }
    if (!phone.match(/^(0[79]\d{8}|260[79]\d{8})$/)) {
      setError('Enter a valid Zambian mobile number (e.g. 0971234567)')
      return
    }
    setLoading(true)
    try {
      const result = await createDonation({
        donor_id: profile?.id,
        donor_name: profile?.full_name || profile?.username || undefined,
        donor_phone: phone,
        amount: amt,
        message: message.trim() || undefined,
      })
      if (result.success) {
        setSuccess(true)
        setTimeout(() => { setSuccess(false); onClose(); setAmount(''); setPhone(''); setMessage('') }, 3000)
      } else {
        setError(result.error || 'Donation failed. Please try again.')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setError(''); setSuccess(false); setAmount(''); setPhone(''); setMessage('') }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60" onClick={() => { reset(); onClose() }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            className="relative bg-bg-card border border-border rounded-2xl p-6 w-full max-w-sm z-10"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center">
                  <Heart size={16} className="text-brand" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">Support ZedVevo</h2>
                  <p className="text-xs text-text-muted mt-0.5">Your donation keeps the platform alive</p>
                </div>
              </div>
              <button onClick={() => { reset(); onClose() }} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors">
                <X size={16} />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Check size={24} className="text-success" />
                </div>
                <p className="text-sm font-medium text-text-primary">Thank you for your donation!</p>
                <p className="text-xs text-text-muted text-center">A payment prompt has been sent to your phone. Please approve to complete.</p>
              </div>
            ) : (
              <>
                {/* Preset amounts */}
                <div className="mb-4">
                  <p className="text-xs text-text-muted mb-2">Choose amount (ZMW)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESETS.map(p => (
                      <button key={p} onClick={() => setAmount(p)}
                        className={`py-2 rounded-xl text-sm font-semibold transition-colors border ${
                          amount === p
                            ? 'bg-brand text-white border-brand'
                            : 'bg-bg-secondary border-border text-text-secondary hover:border-brand/50 hover:text-text-primary'
                        }`}>
                        K{p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <div className="mb-4">
                  <label className="block text-xs text-text-muted mb-1.5">Or enter custom amount</label>
                  <div className="flex items-center gap-2 bg-bg-secondary border border-border rounded-xl px-3 py-2.5 focus-within:border-brand transition-colors">
                    <span className="text-text-muted text-sm font-medium">K</span>
                    <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Enter amount"
                      className="bg-transparent text-text-primary text-sm flex-1 outline-none placeholder:text-text-muted" />
                  </div>
                </div>

                {/* Phone */}
                <div className="mb-4">
                  <label className="block text-xs text-text-muted mb-1.5">Mobile Money Number</label>
                  <div className="flex items-center gap-2 bg-bg-secondary border border-border rounded-xl px-3 py-2.5 focus-within:border-brand transition-colors">
                    <Phone size={15} className="text-text-muted flex-shrink-0" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="0971234567"
                      className="bg-transparent text-text-primary text-sm flex-1 outline-none placeholder:text-text-muted" />
                  </div>
                  <p className="text-xs text-text-muted mt-1">Airtel Money or MTN MoMo</p>
                </div>

                {/* Message */}
                <div className="mb-4">
                  <label className="block text-xs text-text-muted mb-1.5">Message (optional)</label>
                  <input value={message} onChange={e => setMessage(e.target.value)}
                    placeholder="Leave a note…"
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand transition-colors placeholder:text-text-muted" />
                </div>

                {error && <p className="text-xs text-danger mb-3">{error}</p>}

                <button onClick={handleDonate} disabled={loading || !amount || !phone}
                  className="w-full py-3 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Processing…</> : <><Heart size={15} /> Donate {amount ? formatCurrency(Number(amount)) : ''}</>}
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
