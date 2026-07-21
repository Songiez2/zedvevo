import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Music, Video, Download, Play, Users } from 'lucide-react'
import { getAdminStats, getTopSongs, getTopArtists } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'

export default function AdminReports() {
  const location = useLocation()
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: () => getAdminStats() })
  const { data: topSongs = [] } = useQuery({ queryKey: ['admin-top-songs'], queryFn: () => getTopSongs() })
  const { data: topArtists = [] } = useQuery({ queryKey: ['admin-top-artists'], queryFn: () => getTopArtists() })

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-2">Reports & Analytics</h1>
        <p className="text-sm text-text-muted mb-8">Platform performance overview</p>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Streams', value: stats?.totalStreams ?? 0, icon: Play },
            { label: 'Total Downloads', value: stats?.totalDownloads ?? 0, icon: Download },
            { label: 'Active Users', value: stats?.totalUsers ?? 0, icon: Users },
            { label: 'Songs', value: stats?.totalSongs ?? 0, icon: Music },
            { label: 'Videos', value: stats?.totalVideos ?? 0, icon: Video },
            { label: 'Orders', value: stats?.totalOrders ?? 0, icon: BarChart3 },
          ].map(s => (
            <div key={s.label} className="bg-bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">{s.label}</span>
                <s.icon size={16} className="text-brand" />
              </div>
              <p className="text-2xl font-bold text-text-primary">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top Songs */}
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Top Songs by Plays</h2>
            {topSongs.length === 0
              ? <EmptyState title="No data yet" />
              : <div className="space-y-2">
                  {topSongs.map((s: any, i: number) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-bg-card border border-border rounded-xl">
                      <span className="text-sm text-text-muted w-4 text-center">{i + 1}</span>
                      <Music size={14} className="text-brand flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{s.title}</p>
                        <p className="text-xs text-text-muted">{s.profiles?.full_name || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text-primary">{(s.plays || 0).toLocaleString()}</p>
                        <p className="text-xs text-text-muted">plays</p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Top Artists */}
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Top Artists by Followers</h2>
            {topArtists.length === 0
              ? <EmptyState title="No artists yet" />
              : <div className="space-y-2">
                  {topArtists.map((a: any, i: number) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-bg-card border border-border rounded-xl">
                      <span className="text-sm text-text-muted w-4 text-center">{i + 1}</span>
                      {a.profiles?.avatar_url ? <img src={a.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" /> : <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold flex-shrink-0">{(a.artist_name || 'A')[0].toUpperCase()}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{a.artist_name || a.profiles?.full_name || '—'}</p>
                        <p className="text-xs text-text-muted">{a.genre || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-text-primary">{(a.followers || 0).toLocaleString()}</p>
                        <p className="text-xs text-text-muted">followers</p>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
