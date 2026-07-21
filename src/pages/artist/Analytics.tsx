import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Play, Download, Music, Video } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistSongs, getArtistVideos } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'

export default function ArtistAnalytics() {
  const location = useLocation()
  const { profile } = useAuth()

  const { data: songs = [] } = useQuery({ queryKey: ['artist-songs', profile?.id], queryFn: () => getArtistSongs(profile!.id), enabled: !!profile })
  const { data: videos = [] } = useQuery({ queryKey: ['artist-videos', profile?.id], queryFn: () => getArtistVideos(profile!.id), enabled: !!profile })

  const totalSongPlays = songs.reduce((s, t) => s + (t.plays || 0), 0)
  const totalDownloads = songs.reduce((s, t) => s + (t.downloads || 0), 0)
  const totalVideoPlays = videos.reduce((s, t) => s + (t.plays || 0), 0)

  const topSongs = [...songs].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 10)

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-6">Analytics</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Song Plays', value: totalSongPlays.toLocaleString(), icon: Play },
            { label: 'Downloads', value: totalDownloads.toLocaleString(), icon: Download },
            { label: 'Video Plays', value: totalVideoPlays.toLocaleString(), icon: Video },
            { label: 'Total Tracks', value: songs.length, icon: Music },
          ].map(s => (
            <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">{s.label}</span>
                <s.icon size={16} className="text-brand" />
              </div>
              <p className="text-2xl font-bold text-text-primary">{s.value}</p>
            </div>
          ))}
        </div>

        {topSongs.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Top Songs by Plays</h2>
            <div className="space-y-2">
              {topSongs.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-bg-card border border-border rounded-xl">
                  <span className="text-sm text-text-muted w-5 text-center">{i + 1}</span>
                  {s.cover_url ? <img src={s.cover_url} alt={s.title} className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center"><Music size={12} className="text-brand" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{s.title}</p>
                    <p className="text-xs text-text-muted">{s.genre || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">{(s.plays || 0).toLocaleString()}</p>
                    <p className="text-xs text-text-muted">plays</p>
                  </div>
                  {/* Simple bar */}
                  <div className="w-20 h-1.5 bg-bg-secondary rounded-full overflow-hidden hidden md:block">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${topSongs[0].plays ? Math.round(((s.plays || 0) / topSongs[0].plays) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
