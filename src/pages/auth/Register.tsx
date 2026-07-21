import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPw) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (data.user) {
      // Update full_name after profile is auto-created by trigger
      await supabase.from('profiles').update({ full_name: fullName }).eq('id', data.user.id)
    }
    setLoading(false)
    navigate('/')
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-brand font-bold text-2xl">Zed<span className="text-text-primary">Vevo</span></Link>
          <h1 className="text-xl font-semibold text-text-primary mt-4">Create your account</h1>
          <p className="text-sm text-text-muted mt-1">Join Zambia's entertainment platform</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name</label>
            <div className="flex items-center gap-2 bg-bg-card border border-border focus-within:border-brand rounded-xl px-3 py-2.5 transition-colors">
              <User size={16} className="text-text-muted" />
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                placeholder="Your full name"
                className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
            <div className="flex items-center gap-2 bg-bg-card border border-border focus-within:border-brand rounded-xl px-3 py-2.5 transition-colors">
              <Mail size={16} className="text-text-muted" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@example.com"
                className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
            <div className="flex items-center gap-2 bg-bg-card border border-border focus-within:border-brand rounded-xl px-3 py-2.5 transition-colors">
              <Lock size={16} className="text-text-muted" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="At least 6 characters"
                className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="text-text-muted hover:text-text-primary">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
            <div className="flex items-center gap-2 bg-bg-card border border-border focus-within:border-brand rounded-xl px-3 py-2.5 transition-colors">
              <Lock size={16} className="text-text-muted" />
              <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required
                placeholder="Repeat your password"
                className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted" />
            </div>
          </div>

          {error && <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>

          <p className="text-xs text-text-muted text-center">
            By signing up you agree to our terms of service and privacy policy.
          </p>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:text-brand-hover font-medium transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
