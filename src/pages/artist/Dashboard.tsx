import { useLocation, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Music, Disc, Video, Users, TrendingUp, CreditCard, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistSongs, getArtistAlbums, getArtistVideos, getActivePlan } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'
import { formatDate } from '@/lib/utils'
import { ARTIST_PLANS } from '@/types/types'

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: number | string; icon: any; sub?: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
        <Icon size={18} className="text-brand" />
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  )
}

export default function ArtistDashboard() {
  const location = useLocation()
  const { profile } = useAuth()

  const { data: songs = [] } = useQuery({ queryKey: ['artist-songs', profile?.id], queryFn: () => getArtistSongs(profile!.id), enabled: !!profile })
  const { data: albums = [] } = useQuery({ queryKey: ['artist-albums', profile?.id], queryFn: () => getArtistAlbums(profile!.id), enabled: !!profile })
  const { data: videos = [] } = useQuery({ queryKey: ['artist-videos', profile?.id], queryFn: () => getArtistVideos(profile!.id), enabled: !!profile })
  const { data: plan } = useQuery({ queryKey: ['artist-plan', profile?.id], queryFn: () => getActivePlan(profile!.id), enabled: !!profile })

  const totalPlays = songs.reduce((sum, s) => sum + (s.plays || 0), 0)
  const totalDownloads = songs.reduce((sum, s) => sum + (s.downloads || 0), 0)

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-text-primary">Welcome back, {profile?.full_name || profile?.username || 'Artist'}</h1>
          <p className="text-sm text-text-muted mt-1">Here's an overview of your music performance</p>
        </div>

        {/* Plan status + Upload Now CTA */}
        {plan ? (
          <div className="mb-6 bg-brand/10 border border-brand/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard size={18} className="text-brand" />
              <div>
                <p className="text-sm font-medium text-text-primary">{ARTIST_PLANS[plan.plan]?.label ?? plan.plan} Plan active</p>
                <p className="text-xs text-text-muted">Expires {formatDate(plan.expires_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full font-medium">Active</span>
              <Link to="/artist/upload"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg transition-colors">
                <Upload size={13} /> Upload Now
              </Link>
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-warning/10 border border-warning/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-warning font-medium">No active plan — upload access is disabled</p>
            <Link to="/artist/subscription"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-warning hover:bg-warning/80 text-black text-xs font-semibold rounded-lg transition-colors">
              <Upload size={13} /> Get a Plan
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Songs" value={songs.length} icon={Music} />
          <StatCard label="Albums" value={albums.length} icon={Disc} />
          <StatCard label="Videos" value={videos.length} icon={Video} />
          <StatCard label="Total Plays" value={totalPlays.toLocaleString()} icon={TrendingUp} />
          <StatCard label="Downloads" value={totalDownloads.toLocaleString()} icon={TrendingUp} />
          <StatCard label="Followers" value="—" icon={Users} sub="Via artists table" />
        </div>

        {/* Recent Songs */}
        {songs.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Recent Songs</h2>
            <div className="space-y-2">
              {songs.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-bg-card border border-border rounded-xl">
                  {s.cover_url ? <img src={s.cover_url} alt={s.title} className="w-9 h-9 rounded-lg object-cover" /> : <div className="w-9 h-9 rounded-lg bg-brand/20 flex items-center justify-center"><Music size={14} className="text-brand" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{s.title}</p>
                    <p className="text-xs text-text-muted">{s.plays || 0} plays · {s.downloads || 0} downloads</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${s.published ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                    {s.published ? 'Live' : 'Draft'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
