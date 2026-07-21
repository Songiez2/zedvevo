import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Check, Star } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getActivePlan, verifyPayment, activateArtistPlan } from '@/db/api'
import { useToastContext } from '@/hooks/useToastContext'
import PaymentModal from '@/components/ui/PaymentModal'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'
import { ARTIST_PLANS, ArtistPlanType } from '@/types/types'
import { formatCurrency, formatDate } from '@/lib/utils'

const PLAN_HIGHLIGHTS: Record<ArtistPlanType, { color: string; badge?: string }> = {
  single: { color: 'text-text-muted' },
  weekly: { color: 'text-brand', badge: 'Popular' },
  annual: { color: 'text-warning', badge: 'Best Value' },
}

export default function ArtistSubscription() {
  const location = useLocation()
  const { profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const { addToast } = useToastContext()
  const [selectedPlan, setSelectedPlan] = useState<ArtistPlanType>('weekly')
  const [payOpen, setPayOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: plan, refetch } = useQuery({
    queryKey: ['artist-plan', profile?.id],
    queryFn: () => getActivePlan(profile!.id),
    enabled: !!profile,
  })

  // Clean up any running poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handlePaySuccess = async (paymentId: string) => {
    setPayOpen(false)
    addToast('Payment initiated! Activating your plan…', 'info', 6000)

    let attempts = 0
    pollRef.current = setInterval(async () => {
      attempts++
      try {
        const result = await verifyPayment(paymentId)

        if (result.status === 'completed') {
          clearInterval(pollRef.current!)
          // Auto-activate the plan immediately
          if (profile) {
            const activation = await activateArtistPlan(paymentId, profile.id, selectedPlan)
            if (activation.success) {
              addToast('🎉 Plan activated! You can now upload music and videos.', 'success', 7000)
            } else {
              addToast('Plan activation pending — please refresh in a moment.', 'warning')
            }
          }
          await refetch()
          await refreshProfile()
          qc.invalidateQueries({ queryKey: ['notifications'] })
        } else if (result.status === 'failed') {
          clearInterval(pollRef.current!)
          addToast('Payment failed. Please try again or use a different number.', 'error', 7000)
        } else if (attempts >= 24) {
          // 2 min timeout
          clearInterval(pollRef.current!)
          addToast('Payment is taking longer than expected. Check your notifications for updates.', 'warning')
        }
      } catch {
        if (attempts >= 24) {
          clearInterval(pollRef.current!)
          addToast('Could not confirm payment. Check your notifications.', 'warning')
        }
      }
    }, 5000)
  }

  const handlePayFail = (errorMsg?: string) => {
    addToast(errorMsg || 'Payment could not be initiated. Please try again.', 'error', 6000)
  }

  const daysRemaining = plan
    ? Math.max(0, Math.ceil((new Date(plan.expires_at).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-2">Upload Plans</h1>
        <p className="text-sm text-text-muted mb-8">Choose a plan to start uploading music and videos to ZedVevo</p>

        {/* Active plan banner */}
        {plan && (
          <div className="mb-8 p-5 bg-bg-card border border-brand/20 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard size={20} className="text-brand" />
              <h2 className="text-base font-semibold text-text-primary">Current Plan</h2>
              <span className="ml-auto text-xs bg-success/10 text-success px-2 py-1 rounded-full font-medium">Active</span>
            </div>
            <p className="text-2xl font-bold text-text-primary capitalize">{ARTIST_PLANS[plan.plan]?.label ?? plan.plan} Plan</p>
            <div className="mt-3 space-y-1 text-sm text-text-muted">
              <p>Expires: {formatDate(plan.expires_at)}</p>
              <p className={daysRemaining < 3 ? 'text-warning font-medium' : ''}>
                {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
              </p>
            </div>
          </div>
        )}

        {!plan && (
          <div className="mb-8 p-4 bg-warning/10 border border-warning/20 rounded-2xl">
            <p className="text-sm text-warning font-medium">No active plan — choose a plan below to start uploading.</p>
          </div>
        )}

        {/* Plan cards */}
        <h2 className="text-base font-semibold text-text-primary mb-4">
          {plan ? 'Renew or Upgrade' : 'Choose a Plan'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mb-8">
          {(Object.entries(ARTIST_PLANS) as [ArtistPlanType, typeof ARTIST_PLANS[ArtistPlanType]][]).map(([key, p]) => {
            const highlight = PLAN_HIGHLIGHTS[key]
            const isSelected = selectedPlan === key
            return (
              <button key={key} onClick={() => setSelectedPlan(key)}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                  isSelected ? 'border-brand bg-brand/5' : 'border-border bg-bg-card hover:border-brand/40'
                }`}>
                {/* Badge */}
                {highlight.badge && (
                  <span className={`absolute -top-2.5 left-4 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    key === 'annual' ? 'bg-warning/20 text-warning' : 'bg-brand/20 text-brand'
                  }`}>
                    {highlight.badge}
                  </span>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">{p.label}</p>
                    <p className="text-2xl font-bold text-text-primary">{formatCurrency(p.price)}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {key === 'single' ? 'per upload' : key === 'weekly' ? 'per week' : 'per year'}
                    </p>
                  </div>
                  {isSelected && <Check size={18} className="text-brand flex-shrink-0 mt-1" />}
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mt-4">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                      <Star size={10} className={`flex-shrink-0 mt-0.5 ${highlight.color}`} />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <button onClick={() => setPayOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors">
          <CreditCard size={16} />
          Pay {formatCurrency(ARTIST_PLANS[selectedPlan].price)} via Lipila — {ARTIST_PLANS[selectedPlan].label}
        </button>
      </div>

      {payOpen && profile && (
        <PaymentModal
          isOpen={payOpen}
          onClose={() => setPayOpen(false)}
          onSuccess={handlePaySuccess}
          onFail={handlePayFail}
          amount={ARTIST_PLANS[selectedPlan].price}
          contentType="artist_plan"
          contentId={selectedPlan}
          description={`Artist ${ARTIST_PLANS[selectedPlan].label} Plan`}
        />
      )}
    </DashboardLayout>
  )
}
