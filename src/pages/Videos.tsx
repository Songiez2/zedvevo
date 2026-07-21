import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Play, Lock } from 'lucide-react'
import { getPublishedVideos } from '@/db/api'
import { formatCurrency } from '@/lib/utils'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'

export default function VideosPage() {
  const [genre, setGenre] = useState('All')
  const GENRES = ['All', 'Zambian Music', 'Afrobeats', 'Hip Hop', 'Gospel', 'R&B', 'Pop']

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['videos', genre],
    queryFn: () => getPublishedVideos(40),
  })

  const filtered = genre === 'All' ? videos : videos.filter(v => v.genre === genre)

  return (
    <div className="animate-fade-in">
      <PageSection>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Videos</h1>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {GENRES.map(g => (
              <button key={g} onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${genre === g ? 'bg-brand text-white' : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {isLoading
          ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="rounded-2xl overflow-hidden"><div className="aspect-video bg-bg-card animate-pulse" /><div className="p-3 space-y-2"><div className="h-3 bg-bg-card animate-pulse rounded-xl" /><div className="h-2.5 bg-bg-card animate-pulse rounded-xl w-2/3" /></div></div>)}</div>
          : filtered.length === 0
            ? <EmptyState title="No videos available yet" description="Artists will upload videos once they activate their plans." />
            : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {filtered.map(v => (
                  <Link key={v.id} to={`/videos/${v.id}`} className="group block bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                    <div className="relative aspect-video bg-bg-secondary overflow-hidden">
                      {v.thumbnail_url
                        ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center"><Play size={32} className="text-text-muted" /></div>
                      }
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-14 h-14 rounded-full bg-brand/90 flex items-center justify-center">
                          <Play size={24} className="text-white ml-1" />
                        </div>
                      </div>
                      {v.is_premium && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 text-warning text-xs px-2 py-1 rounded-full">
                          <Lock size={10} /> {formatCurrency(v.price || 0)}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-text-primary truncate">{v.title}</p>
                      <p className="text-xs text-text-muted mt-1">{(v as any).artist?.full_name || (v as any).artist?.username || 'Artist'}</p>
                      {v.genre && <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full mt-2 inline-block">{v.genre}</span>}
                    </div>
                  </Link>
                ))}
              </div>
        }
      </PageSection>
    </div>
  )
}
