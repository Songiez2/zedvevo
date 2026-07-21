import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic2, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getActivePlan } from '@/db/api'
import PaymentModal from '@/components/ui/PaymentModal'
import PageSection from '@/components/ui/PageSection'
import { ARTIST_PLANS, ArtistPlanType } from '@/types/types'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export default function BecomeArtistPage() {
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<ArtistPlanType>('weekly')
  const [payOpen, setPayOpen] = useState(false)
  const [activating, setActivating] = useState(false)

  const { data: _activePlan } = useQuery({
    queryKey: ['active-plan', profile?.id],
    queryFn: () => getActivePlan(profile!.id),
    enabled: !!profile,
  })

  const handlePaySuccess = async (_paymentId: string) => {
    setPayOpen(false)
    setActivating(true)
    // Poll for artist activation
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      await refreshProfile()
      const { data: updatedProfile } = await supabase.from('profiles').select('role').eq('id', profile!.id).maybeSingle()
      if (updatedProfile?.role === 'artist' || updatedProfile?.role === 'admin') {
        clearInterval(poll)
        setActivating(false)
        navigate('/artist/dashboard')
      }
      if (attempts > 15) { clearInterval(poll); setActivating(false) }
    }, 5000)
  }

  if (profile?.role === 'artist' || profile?.role === 'admin') {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <Mic2 size={48} className="text-brand mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary">You're already an artist!</h2>
          <p className="text-sm text-text-muted mt-2">Manage your music from the Artist Dashboard.</p>
          <button onClick={() => navigate('/artist/dashboard')}
            className="mt-5 px-6 py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (activating) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary font-medium">Activating your artist account…</p>
          <p className="text-sm text-text-muted mt-1">This may take a moment after payment confirmation.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <PageSection>
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Mic2 size={40} className="text-brand mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-text-primary">Become an Artist</h1>
          <p className="text-text-secondary mt-3 max-w-xl mx-auto">Select a plan and start uploading your music. No manual approval — your account is activated automatically after payment.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto mb-10">
          {(Object.entries(ARTIST_PLANS) as [ArtistPlanType, typeof ARTIST_PLANS[ArtistPlanType]][]).map(([key, plan]) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedPlan(key)}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${selectedPlan === key ? 'border-brand bg-brand/10' : 'border-border bg-bg-card hover:border-brand/40'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-text-secondary uppercase tracking-wide">{plan.label}</span>
                {selectedPlan === key && <div className="w-5 h-5 bg-brand rounded-full flex items-center justify-center"><Check size={12} className="text-white" /></div>}
              </div>
              <p className="text-3xl font-bold text-text-primary">{formatCurrency(plan.price)}</p>
              <p className="text-sm text-text-muted mt-1">{plan.days === 1 ? '24 hours' : plan.days === 7 ? '7 days' : '365 days'}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-success flex-shrink-0" />
                  {plan.uploadLimit === null ? 'Unlimited uploads' : `${plan.uploadLimit} song upload${plan.uploadLimit > 1 ? 's' : ''}`}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-success flex-shrink-0" />
                  {plan.description}
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-success flex-shrink-0" />
                  Instant activation
                </li>
              </ul>
            </motion.button>
          ))}
        </div>

        <div className="text-center">
          <button onClick={() => setPayOpen(true)}
            className="px-10 py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-xl transition-colors text-base">
            Pay {formatCurrency(ARTIST_PLANS[selectedPlan].price)} & Activate
          </button>
          <p className="text-xs text-text-muted mt-3">Payment processed by Lipila · Zambian mobile money</p>
        </div>
      </PageSection>

      {payOpen && profile && (
        <PaymentModal isOpen={payOpen} onClose={() => setPayOpen(false)} onSuccess={handlePaySuccess}
          amount={ARTIST_PLANS[selectedPlan].price} contentType="artist_plan"
          description={`Artist ${ARTIST_PLANS[selectedPlan].label} Plan — ${ARTIST_PLANS[selectedPlan].description}`} />
      )}
    </div>
  )
}
