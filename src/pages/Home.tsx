import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, ArrowRight, Music, Video, ShoppingBag, Ticket, Upload, ChevronLeft, ChevronRight } from 'lucide-react'
import { getTrendingSongs, getNewReleases } from '@/services/musicApi'
import { getPublishedVideos, getProducts, getEvents, getHeroSlides, getPublishedSongs, type HeroSlide } from '@/db/api'
import { songToExternalMusic } from '@/services/musicApi'
import TrackCard from '@/components/music/TrackCard'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'
import { formatCurrency, formatDate } from '@/lib/utils'
import { usePlayerStore } from '@/stores/playerStore'
import { useAuth } from '@/contexts/AuthContext'

function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      <Link to={to} className="text-sm text-brand hover:text-brand-hover flex items-center gap-1 transition-colors">
        View all <ArrowRight size={14} />
      </Link>
    </div>
  )
}

// ── Hero Slider ────────────────────────────────────────────────────
function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [current, setCurrent] = useState(0)
  const total = slides.length

  // Auto-advance every 5 s
  useEffect(() => {
    if (total < 2) return
    const t = setInterval(() => setCurrent(c => (c + 1) % total), 5000)
    return () => clearInterval(t)
  }, [total])

  const prev = () => setCurrent(c => (c - 1 + total) % total)
  const next = () => setCurrent(c => (c + 1) % total)

  if (total === 0) return null

  const slide = slides[current]

  return (
    <div className="relative overflow-hidden border-b border-border">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="relative min-h-[340px] md:min-h-[420px] flex items-center"
        >
          {/* Background image */}
          {slide.image_url && (
            <div className="absolute inset-0">
              <img src={slide.image_url} alt={slide.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            </div>
          )}
          {!slide.image_url && (
            <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary via-bg-primary to-brand/10" />
          )}

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-16">
            <h2 className={`text-3xl md:text-5xl font-bold leading-tight mb-3 ${slide.image_url ? 'text-white' : 'text-text-primary'}`}>
              {slide.title}
            </h2>
            {slide.subtitle && (
              <p className={`text-base md:text-lg max-w-lg mb-6 ${slide.image_url ? 'text-white/80' : 'text-text-secondary'}`}>
                {slide.subtitle}
              </p>
            )}
            {slide.link_url && (
              <Link
                to={slide.link_url}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors text-sm"
              >
                {slide.link_label || 'Learn More'} <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Prev / Next */}
      {total > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors z-20">
            <ChevronLeft size={18} />
          </button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-colors z-20">
            <ChevronRight size={18} />
          </button>
          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-5' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Home() {
  const { session, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const isArtist = profile?.role === 'artist'
  // Smart upload CTA: admin/artist go directly to upload, others to subscription
  const uploadHref = (isAdmin || isArtist) ? '/artist/upload' : '/artist/subscription'
  const { data: heroSlides = [] } = useQuery({ queryKey: ['hero-slides'], queryFn: getHeroSlides })
  const { data: trending = [], isLoading: trendingLoading } = useQuery({ queryKey: ['trending'], queryFn: () => getTrendingSongs(12) })
  const { data: newReleases = [], isLoading: newReleasesLoading } = useQuery({ queryKey: ['new-releases'], queryFn: () => getNewReleases(12) })
  const { data: uploadedSongs = [] } = useQuery({ queryKey: ['home-uploads'], queryFn: () => getPublishedSongs(12) })
  const { data: videos = [] } = useQuery({ queryKey: ['videos-home'], queryFn: () => getPublishedVideos(6) })
  const { data: products = [] } = useQuery({ queryKey: ['products-home'], queryFn: () => getProducts(4) })
  const { data: events = [] } = useQuery({ queryKey: ['events-home'], queryFn: () => getEvents(3) })
  const _setTrack = usePlayerStore(s => s.setTrack)

  return (
    <div className="animate-fade-in">
      {/* Hero: admin slides when available, otherwise static fallback */}
      {heroSlides.length > 0 ? (
        <HeroSlider slides={heroSlides} />
      ) : (
        <div className="relative overflow-hidden bg-gradient-to-br from-bg-secondary via-bg-primary to-brand/5 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
              <span className="inline-block text-xs font-semibold text-brand bg-brand/10 px-3 py-1.5 rounded-full mb-4 tracking-wider uppercase">Zambia's Entertainment Hub</span>
              <h1 className="text-4xl md:text-6xl font-bold text-text-primary leading-tight">
                Your music,<br /><span className="text-brand">your culture</span>
              </h1>
              <p className="mt-4 text-lg text-text-secondary max-w-lg leading-relaxed">
                Stream music, watch videos, buy tickets, and support Zambian artists — all in one place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/stream" className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors">
                  <Play size={18} /> Start Streaming
                </Link>
                {session ? (
                  <>
                    <Link to={uploadHref} className="flex items-center gap-2 px-6 py-3 border border-border hover:border-brand/50 text-text-secondary hover:text-text-primary font-medium rounded-xl transition-colors">
                      <Upload size={16} /> Upload Now
                    </Link>
                    {isAdmin && (
                      <Link to="/admin/dashboard" className="flex items-center gap-2 px-6 py-3 border border-brand/40 bg-brand/5 hover:bg-brand/10 text-brand font-medium rounded-xl transition-colors">
                        Admin Panel
                      </Link>
                    )}
                  </>
                ) : (
                  <Link to="/register" className="flex items-center gap-2 px-6 py-3 border border-border hover:border-brand/50 text-text-secondary hover:text-text-primary font-medium rounded-xl transition-colors">
                    Create Account
                  </Link>
                )}
              </div>
            </motion.div>
          </div>
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-brand/5 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Feature cards */}
      <PageSection>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Music, label: 'Music', desc: 'Stream & download', to: '/music', color: 'text-brand' },
            { icon: Video, label: 'Videos', desc: 'Watch music videos', to: '/videos', color: 'text-success' },
            { icon: ShoppingBag, label: 'Store', desc: 'Merch & products', to: '/store', color: 'text-warning' },
            { icon: Ticket, label: 'Events', desc: 'Live concerts & shows', to: '/events', color: 'text-danger' },
          ].map(({ icon: Icon, label, desc, to, color }) => (
            <Link key={to} to={to} className="group flex flex-col items-start gap-3 p-5 bg-bg-card border border-border rounded-2xl hover:border-brand/30 transition-all">
              <Icon size={24} className={color} />
              <div>
                <p className="text-sm font-semibold text-text-primary">{label}</p>
                <p className="text-xs text-text-muted mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </PageSection>

      {/* ZedVevo Artists — uploaded songs, always shown first */}
      {uploadedSongs.length > 0 && (
        <PageSection>
          <SectionHeader title="ZedVevo Artists" to="/music" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {uploadedSongs.map(s => (
              <TrackCard key={s.id} track={songToExternalMusic(s as any)} queue={uploadedSongs.map(x => songToExternalMusic(x as any))} />
            ))}
          </div>
        </PageSection>
      )}

      {/* Trending */}
      <PageSection>
        <SectionHeader title="Trending Now" to="/music" />
        {trendingLoading
          ? <Skeleton count={12} />
          : trending.length === 0
            ? <EmptyState title="No music available yet" description="Check back soon or add a Jamendo API key in settings." />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {trending.map(t => <TrackCard key={t.id} track={t} queue={trending} />)}
              </div>
        }
      </PageSection>

      {/* New Releases */}
      <PageSection>
        <SectionHeader title="New Releases" to="/music?sort=new" />
        {newReleasesLoading
          ? <Skeleton count={12} />
          : newReleases.length === 0
            ? <EmptyState title="No new releases yet" />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {newReleases.map(t => <TrackCard key={t.id} track={t} queue={newReleases} />)}
              </div>
        }
      </PageSection>

      {/* Videos */}
      {videos.length > 0 && (
        <PageSection>
          <SectionHeader title="Latest Videos" to="/videos" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {videos.map(v => (
              <Link key={v.id} to={`/videos/${v.id}`} className="group block bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                <div className="relative aspect-video bg-bg-secondary">
                  {v.thumbnail_url
                    ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Video size={32} className="text-text-muted" /></div>
                  }
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-brand/90 flex items-center justify-center">
                      <Play size={20} className="text-white ml-1" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-text-primary truncate">{v.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{(v as any).artist?.full_name || (v as any).artist?.username || 'Artist'}</p>
                  {v.is_premium && <span className="text-xs text-warning font-medium">{formatCurrency(v.price || 0)}</span>}
                </div>
              </Link>
            ))}
          </div>
        </PageSection>
      )}

      {/* Products */}
      {products.length > 0 && (
        <PageSection>
          <SectionHeader title="Store" to="/store" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map(p => (
              <Link key={p.id} to={`/store/${p.id}`} className="group bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                <div className="aspect-square bg-bg-secondary">
                  {p.images[0]
                    ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={28} className="text-text-muted" /></div>
                  }
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-text-primary truncate">{p.title}</p>
                  <p className="text-xs text-brand font-semibold mt-1">{formatCurrency(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </PageSection>
      )}

      {/* Events */}
      {events.length > 0 && (
        <PageSection>
          <SectionHeader title="Upcoming Events" to="/events" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {events.map(e => (
              <Link key={e.id} to={`/events/${e.id}`} className="group bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                {e.banner_url
                  ? <img src={e.banner_url} alt={e.title} className="w-full h-40 object-cover" />
                  : <div className="w-full h-40 bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center"><Ticket size={32} className="text-brand/40" /></div>
                }
                <div className="p-4">
                  <p className="text-sm font-semibold text-text-primary">{e.title}</p>
                  <p className="text-xs text-text-muted mt-1">{e.venue}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-text-muted">{formatDate(e.event_date)}</span>
                    <span className="text-xs text-brand font-semibold">{formatCurrency(e.ticket_price)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </PageSection>
      )}

      {/* CTA */}
      <PageSection>
        <div className="bg-gradient-to-br from-brand/10 to-brand/5 border border-brand/20 rounded-2xl p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary">Are you a Zambian artist?</h2>
          <p className="text-text-secondary mt-3 max-w-md mx-auto">Upload your music, reach your fans, and monetise your talent on ZedVevo.</p>
          <Link to="/artist/subscription" className="inline-flex items-center gap-2 mt-6 px-8 py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors">
            <Play size={18} /> Start Uploading
          </Link>
        </div>
      </PageSection>
    </div>
  )
}
