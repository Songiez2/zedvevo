import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Filter } from 'lucide-react'
import { getSongs, songToExternalMusic } from '@/services/musicApi'
import { getPublishedSongs } from '@/db/api'
import { useQuery as useQ } from '@tanstack/react-query'
import TrackCard from '@/components/music/TrackCard'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'

const GENRES = ['All', 'Zambian Music', 'Afrobeats', 'Hip Hop', 'Gospel', 'R&B', 'Pop', 'Reggae', 'Electronic']
export default function MusicPage() {
  const [genre, setGenre] = useState('All')

  const { data: external = [], isLoading } = useQuery({
    queryKey: ['music', genre],
    queryFn: () => getSongs({ genre: genre === 'All' ? undefined : genre, limit: 60 }),
  })
  const { data: artistSongs = [] } = useQ({
    queryKey: ['artist-songs', genre],
    queryFn: () => getPublishedSongs(30, 0, genre === 'All' ? undefined : genre),
  })

  const allTracks = [...artistSongs.map(s => songToExternalMusic(s as any)), ...external]

  return (
    <div className="animate-fade-in">
      <PageSection>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Music</h1>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-text-muted" />
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                    genre === g ? 'bg-brand text-white' : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading
          ? <Skeleton count={24} />
          : allTracks.length === 0
            ? <EmptyState title="No music available yet" description="Music from artists and Jamendo will appear here." />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {allTracks.map(t => <TrackCard key={t.id} track={t} queue={allTracks} />)}
              </div>
        }
      </PageSection>
    </div>
  )
}
