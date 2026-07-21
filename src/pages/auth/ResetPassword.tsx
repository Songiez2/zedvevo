import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/profile`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-brand font-bold text-2xl">Zed<span className="text-text-primary">Vevo</span></Link>
          <h1 className="text-xl font-semibold text-text-primary mt-4">Reset Password</h1>
          <p className="text-sm text-text-muted mt-1">We'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle size={40} className="text-success" />
            <h2 className="text-base font-semibold text-text-primary">Check your email</h2>
            <p className="text-sm text-text-muted">We sent a password reset link to <strong className="text-text-secondary">{email}</strong></p>
            <Link to="/login" className="text-sm text-brand hover:text-brand-hover transition-colors font-medium">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Email address</label>
              <div className="flex items-center gap-2 bg-bg-card border border-border focus-within:border-brand rounded-xl px-3 py-2.5 transition-colors">
                <Mail size={16} className="text-text-muted" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted" />
              </div>
            </div>
            {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <p className="text-center text-sm text-text-muted">
              <Link to="/login" className="text-brand hover:text-brand-hover transition-colors">Back to sign in</Link>
            </p>
          </form>
        )}
      </motion.div>
    </div>
  )
}
