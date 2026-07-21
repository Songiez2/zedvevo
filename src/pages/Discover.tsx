import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Music, Play, Lock, Filter } from 'lucide-react'
import { getSongs } from '@/services/musicApi'
import { getPublishedSongs, getPublishedVideos } from '@/db/api'
import TrackCard from '@/components/music/TrackCard'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'
import { formatCurrency } from '@/lib/utils'

type Tab = 'all' | 'music' | 'videos'

const GENRES = ['All', 'Zambian Music', 'Afrobeats', 'Hip Hop', 'Gospel', 'R&B', 'Pop', 'Reggae', 'Electronic']

export default function DiscoverPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [genre, setGenre] = useState('All')

  const { data: externalSongs = [], isLoading: extLoading } = useQuery({
    queryKey: ['discover-external', genre],
    queryFn: () => getSongs({ genre: genre === 'All' ? undefined : genre, limit: 60 }),
  })
  const { data: artistSongs = [], isLoading: songsLoading } = useQuery({
    queryKey: ['discover-songs', genre],
    queryFn: () => getPublishedSongs(60, 0, genre === 'All' ? undefined : genre),
  })
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['discover-videos', genre],
    queryFn: () => getPublishedVideos(60),
  })

  const allTracks = [
    ...artistSongs.map(s => ({
      id: s.id, external_id: s.id, title: s.title,
      artist: (s as any).artist?.full_name || (s as any).artist?.username || 'Artist',
      album: null, cover: s.cover_url, audio_url: s.audio_url, genre: s.genre,
      source: 'upload', duration: s.duration, plays: s.plays, downloads: s.downloads,
      is_premium: s.is_premium, price: s.price, created_at: s.created_at,
    })),
    ...externalSongs,
  ]

  const filteredVideos = genre === 'All' ? videos : videos.filter(v => v.genre === genre)

  const isLoading = extLoading || songsLoading || videosLoading

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'all',    label: 'All',    count: allTracks.length + filteredVideos.length },
    { id: 'music',  label: 'Music',  count: allTracks.length },
    { id: 'videos', label: 'Videos', count: filteredVideos.length },
  ]

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="border-b border-border bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h1 className="text-3xl font-bold text-text-primary">Discover</h1>
          <p className="text-text-muted mt-1">Stream Zambian music and music videos</p>
        </div>
      </div>

      <PageSection>
        {/* Tabs + genre filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          {/* Content type tabs */}
          <div className="flex gap-1 bg-bg-secondary rounded-xl p-1 w-fit">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-bg-primary text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                }`}>
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-brand/10 text-brand' : 'bg-border text-text-muted'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Genre filter */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <Filter size={14} className="text-text-muted flex-shrink-0" />
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {GENRES.map(g => (
                <button key={g} onClick={() => setGenre(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                    genre === g ? 'bg-brand text-white' : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            {(tab === 'all' || tab === 'music') && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="space-y-2"><div className="aspect-square bg-bg-card animate-pulse rounded-2xl" /><div className="h-3 bg-bg-card animate-pulse rounded" /><div className="h-2.5 bg-bg-card animate-pulse rounded w-2/3" /></div>)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Music section */}
            {(tab === 'all' || tab === 'music') && (
              <section>
                {tab === 'all' && (
                  <div className="flex items-center gap-2 mb-5">
                    <Music size={18} className="text-brand" />
                    <h2 className="text-lg font-semibold text-text-primary">Music</h2>
                    <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">{allTracks.length}</span>
                  </div>
                )}
                {allTracks.length === 0
                  ? <EmptyState title="No music yet" description="Artists will upload music once they activate their plans." />
                  : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {(tab === 'all' ? allTracks.slice(0, 12) : allTracks).map(t => (
                        <TrackCard key={t.id} track={t} queue={allTracks} />
                      ))}
                    </div>
                }
              </section>
            )}

            {/* Videos section */}
            {(tab === 'all' || tab === 'videos') && (
              <section>
                {tab === 'all' && (
                  <div className="flex items-center gap-2 mb-5">
                    <Play size={18} className="text-success" />
                    <h2 className="text-lg font-semibold text-text-primary">Music Videos</h2>
                    <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">{filteredVideos.length}</span>
                  </div>
                )}
                {filteredVideos.length === 0
                  ? <EmptyState title="No videos yet" description="Artists will upload music videos once they activate their plans." />
                  : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {(tab === 'all' ? filteredVideos.slice(0, 6) : filteredVideos).map(v => (
                        <Link key={v.id} to={`/videos/${v.id}`}
                          className="group block bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                          <div className="relative aspect-video bg-bg-secondary overflow-hidden">
                            {v.thumbnail_url
                              ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              : <div className="w-full h-full flex items-center justify-center"><Play size={32} className="text-text-muted" /></div>
                            }
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 rounded-full bg-brand/90 flex items-center justify-center">
                                <Play size={20} className="text-white ml-1" />
                              </div>
                            </div>
                            {v.is_premium && (
                              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-warning text-xs px-2 py-1 rounded-full">
                                <Lock size={10} /> {formatCurrency(v.price || 0)}
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-text-primary truncate">{v.title}</p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {(v as any).artist?.full_name || (v as any).artist?.username || 'Artist'}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                }
              </section>
            )}
          </div>
        )}
      </PageSection>
    </div>
  )
}
