import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Music, Video, ShoppingBag, Ticket } from 'lucide-react'
import { globalSearch } from '@/db/api'
import TrackCard from '@/components/music/TrackCard'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'
import { formatCurrency } from '@/lib/utils'
import type { ExternalMusic } from '@/types/types'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ music: ExternalMusic[]; videos: any[]; products: any[]; events: any[] } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (q.trim().length < 2) { setResults(null); return }
    setLoading(true)
    try {
      const r = await globalSearch(q.trim())
      setResults(r)
    } finally {
      setLoading(false)
    }
  }

  const total = results ? results.music.length + results.videos.length + results.products.length + results.events.length : 0

  return (
    <div className="animate-fade-in">
      <PageSection>
        {/* Search bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <h1 className="text-2xl font-bold text-text-primary mb-4 text-center">Search ZedVevo</h1>
          <div className="flex items-center gap-3 bg-bg-card border border-border focus-within:border-brand rounded-2xl px-4 py-3 transition-colors">
            <Search size={20} className="text-text-muted flex-shrink-0" />
            <input
              autoFocus type="text" value={query} onChange={e => handleSearch(e.target.value)}
              placeholder="Search music, artists, videos, products…"
              className="flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-muted text-sm"
            />
            {loading && <div className="w-4 h-4 border border-brand border-t-transparent rounded-full animate-spin" />}
          </div>
        </div>

        {!results && !loading && (
          <EmptyState icon={<Search size={28} className="text-text-muted" />} title="Search for anything" description="Find music, videos, products, and events across ZedVevo." />
        )}

        {results && total === 0 && (
          <EmptyState icon={<Search size={28} className="text-text-muted" />} title={`No results for "${query}"`} description="Try different keywords or browse our categories." />
        )}

        {results && total > 0 && (
          <div className="space-y-10">
            {results.music.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Music size={18} className="text-brand" />
                  <h2 className="text-base font-semibold text-text-primary">Music ({results.music.length})</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {results.music.map(t => <TrackCard key={t.id} track={t} queue={results.music} />)}
                </div>
              </div>
            )}

            {results.videos.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Video size={18} className="text-success" />
                  <h2 className="text-base font-semibold text-text-primary">Videos ({results.videos.length})</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {results.videos.map(v => (
                    <Link key={v.id} to={`/videos/${v.id}`} className="flex gap-3 bg-bg-card border border-border rounded-xl p-3 hover:border-brand/30 transition-all">
                      <div className="w-24 h-16 bg-bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                        {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video size={16} className="text-text-muted" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{v.title}</p>
                        {v.is_premium && <span className="text-xs text-warning">{formatCurrency(v.price)}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.products.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBag size={18} className="text-warning" />
                  <h2 className="text-base font-semibold text-text-primary">Products ({results.products.length})</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {results.products.map(p => (
                    <Link key={p.id} to={`/store/${p.id}`} className="bg-bg-card border border-border rounded-xl overflow-hidden hover:border-brand/30 transition-all">
                      <div className="aspect-square bg-bg-secondary">{p.images[0] ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={20} className="text-text-muted" /></div>}</div>
                      <div className="p-2.5"><p className="text-sm font-medium text-text-primary truncate">{p.title}</p><p className="text-xs text-brand font-semibold mt-0.5">{formatCurrency(p.price)}</p></div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {results.events.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Ticket size={18} className="text-danger" />
                  <h2 className="text-base font-semibold text-text-primary">Events ({results.events.length})</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.events.map(e => (
                    <Link key={e.id} to={`/events/${e.id}`} className="flex gap-3 bg-bg-card border border-border rounded-xl p-3 hover:border-brand/30 transition-all">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{e.title}</p>
                        <p className="text-xs text-text-muted mt-0.5">{e.venue}</p>
                        <p className="text-xs text-brand font-medium mt-1">{formatCurrency(e.ticket_price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PageSection>
    </div>
  )
}
