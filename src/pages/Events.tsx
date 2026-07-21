import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Ticket, MapPin, Calendar } from 'lucide-react'
import { getEvents } from '@/db/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'

export default function EventsPage() {
  const { data: events = [], isLoading } = useQuery({ queryKey: ['events'], queryFn: () => getEvents(40) })

  return (
    <div className="animate-fade-in">
      <PageSection>
        <h1 className="text-2xl font-bold text-text-primary mb-8">Upcoming Events</h1>

        {isLoading
          ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="rounded-2xl overflow-hidden"><div className="h-48 bg-bg-card animate-pulse" /><div className="p-4 space-y-2"><div className="h-3 bg-bg-card animate-pulse rounded" /><div className="h-2.5 bg-bg-card animate-pulse rounded w-2/3" /></div></div>)}</div>
          : events.length === 0
            ? <EmptyState icon={<Ticket size={28} className="text-text-muted" />} title="No events scheduled" description="Check back soon for upcoming events and concerts." />
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events.map(e => (
                  <Link key={e.id} to={`/events/${e.id}`} className="group block bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                    {e.banner_url
                      ? <img src={e.banner_url} alt={e.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-48 bg-gradient-to-br from-brand/20 to-bg-secondary flex items-center justify-center">
                          <Ticket size={48} className="text-brand/30" />
                        </div>
                    }
                    <div className="p-4">
                      <p className="text-sm font-semibold text-text-primary">{e.title}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-text-muted">
                        <MapPin size={12} /> {e.venue}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-text-muted">
                        <Calendar size={12} /> {formatDate(e.event_date)}
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm font-bold text-brand">{formatCurrency(e.ticket_price)}</span>
                        <span className="text-xs text-text-muted">{e.total_qty - e.sold_qty} tickets left</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
        }
      </PageSection>
    </div>
  )
}
