import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Ticket, MapPin, Calendar, Clock, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { hasPurchased } from '@/db/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import PaymentModal from '@/components/ui/PaymentModal'
import EmptyState from '@/components/ui/EmptyState'
import type { Event } from '@/types/types'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [_purchased, setPurchased] = useState(false) // tracks purchase state after payment
  const [payOpen, setPayOpen] = useState(false)
  const [myTicket, setMyTicket] = useState<any>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('events').select('*').eq('id', id).maybeSingle().then(({ data }) => { setEvent(data); setLoading(false) })
    if (profile) {
      hasPurchased(profile.id, 'ticket', id).then(setPurchased)
      supabase.from('tickets').select('*').eq('user_id', profile.id).eq('event_id', id).maybeSingle().then(({ data }) => setMyTicket(data))
    }
  }, [id, profile])

  const handlePaySuccess = () => {
    setPayOpen(false)
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const { data } = await supabase.from('tickets').select('*').eq('user_id', profile!.id).eq('event_id', id!).maybeSingle()
      if (data) { setMyTicket(data); setPurchased(true); clearInterval(poll) }
      if (attempts > 15) clearInterval(poll)
    }, 5000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!event) return <EmptyState title="Event not found" />

  const soldOut = event.sold_qty >= event.total_qty
  const eventDate = new Date(event.event_date)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <Link to="/events" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Events
      </Link>

      {event.banner_url
        ? <img src={event.banner_url} alt={event.title} className="w-full h-64 md:h-80 object-cover rounded-2xl mb-8" />
        : <div className="w-full h-64 bg-gradient-to-br from-brand/20 to-bg-secondary rounded-2xl mb-8 flex items-center justify-center"><Ticket size={56} className="text-brand/30" /></div>
      }

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main info */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{event.title}</h1>
            {event.description && <p className="mt-3 text-sm text-text-secondary leading-relaxed">{event.description}</p>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Calendar size={16} className="text-brand flex-shrink-0" />
              <span>{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Clock size={16} className="text-brand flex-shrink-0" />
              <span>{eventDate.toLocaleTimeString('en-ZM', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <MapPin size={16} className="text-brand flex-shrink-0" />
              <span>{event.venue}</span>
            </div>
          </div>
        </div>

        {/* Purchase card */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 space-y-4 self-start">
          <div>
            <p className="text-xs text-text-muted">Ticket Price</p>
            <p className="text-3xl font-bold text-brand">{formatCurrency(event.ticket_price)}</p>
          </div>
          <p className="text-xs text-text-muted">{event.total_qty - event.sold_qty} of {event.total_qty} tickets remaining</p>

          {myTicket ? (
            <div className="space-y-3">
              <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-xl text-sm text-success font-medium text-center">
                ✓ You have a ticket!
              </div>
              <div className="text-center">
                <p className="text-xs text-text-muted">Ticket #{myTicket.ticket_number}</p>
                {myTicket.qr_code && (
                  <img src={myTicket.qr_code} alt="QR Code" className="w-32 h-32 mx-auto mt-3 rounded-lg" />
                )}
              </div>
              <Link to="/library" className="block text-center text-sm text-brand hover:text-brand-hover transition-colors">View in Library</Link>
            </div>
          ) : soldOut ? (
            <div className="w-full py-3 bg-bg-secondary border border-border text-text-muted text-center rounded-xl text-sm">
              Sold Out
            </div>
          ) : profile ? (
            <button onClick={() => setPayOpen(true)}
              className="w-full py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
              <Ticket size={18} /> Buy Ticket
            </button>
          ) : (
            <Link to="/login" className="block w-full text-center py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors">
              Sign in to Buy
            </Link>
          )}
        </div>
      </div>

      {payOpen && profile && (
        <PaymentModal isOpen={payOpen} onClose={() => setPayOpen(false)} onSuccess={handlePaySuccess}
          amount={event.ticket_price} contentType="ticket" contentId={event.id}
          description={`Ticket for "${event.title}" at ${event.venue}`} />
      )}
    </div>
  )
}
