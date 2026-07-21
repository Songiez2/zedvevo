import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Users, Music, Video, Download, Play, ShoppingBag, Ticket, Mic2, CreditCard } from 'lucide-react'
import { getAdminStats, getTopSongs, getTopArtists } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'

interface StatCardProps { label: string; value: number | string; icon: React.ElementType; sub?: string; accent?: string }

function StatCard({ label, value, icon: Icon, sub, accent = 'text-brand' }: StatCardProps) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-brand/10`}>
          <Icon size={17} className={accent} />
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary mb-0.5">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-xs text-text-muted">{label}</p>
      {sub && <p className="text-[11px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs text-text-secondary w-28 truncate flex-shrink-0">{label}</p>
      <div className="flex-1 bg-bg-secondary rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-text-muted w-10 text-right flex-shrink-0">{value.toLocaleString()}</p>
    </div>
  )
}

export default function AdminAnalytics() {
  const location = useLocation()
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats, staleTime: 60000 })
  const { data: topSongs = [] } = useQuery({ queryKey: ['admin-top-songs'], queryFn: () => getTopSongs(8) })
  const { data: topArtists = [] } = useQuery({ queryKey: ['admin-top-artists'], queryFn: () => getTopArtists(8) })

  const maxPlays = Math.max(...topSongs.map((s: any) => s.plays || 0), 1)
  const maxFollowers = Math.max(...topArtists.map((a: any) => a.followers || 0), 1)

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={20} className="text-brand" />
          <h1 className="text-xl font-bold text-text-primary">Analytics</h1>
        </div>
        <p className="text-sm text-text-muted mb-8">Real-time platform performance metrics</p>

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          <StatCard label="Total Users"     value={stats?.totalUsers ?? 0}     icon={Users}       />
          <StatCard label="Artists"         value={stats?.totalArtists ?? 0}   icon={Mic2}        />
          <StatCard label="Songs"           value={stats?.totalSongs ?? 0}     icon={Music}       />
          <StatCard label="Videos"          value={stats?.totalVideos ?? 0}    icon={Video}       />
          <StatCard label="Total Streams"   value={stats?.totalStreams ?? 0}   icon={Play}        />
          <StatCard label="Downloads"       value={stats?.totalDownloads ?? 0} icon={Download}    />
          <StatCard label="Orders"          value={stats?.totalOrders ?? 0}    icon={ShoppingBag} />
          <StatCard label="Tickets Sold"    value={stats?.totalTickets ?? 0}   icon={Ticket}      />
          <StatCard label="Payments"        value={stats?.totalPayments ?? 0}  icon={CreditCard}  />
          <StatCard label="Albums"          value={stats?.totalAlbums ?? 0}    icon={Music}       />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Top Songs */}
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-5">Top Songs · Plays</h2>
            {topSongs.length === 0
              ? <p className="text-sm text-text-muted py-4 text-center">No data yet</p>
              : <div className="space-y-3">
                  {topSongs.map((s: any) => (
                    <BarRow key={s.id} label={s.title} value={s.plays || 0} max={maxPlays} />
                  ))}
                </div>
            }
          </div>

          {/* Top Artists */}
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-5">Top Artists · Followers</h2>
            {topArtists.length === 0
              ? <p className="text-sm text-text-muted py-4 text-center">No data yet</p>
              : <div className="space-y-3">
                  {topArtists.map((a: any) => (
                    <BarRow key={a.id} label={a.artist_name || a.profiles?.full_name || '—'} value={a.followers || 0} max={maxFollowers} />
                  ))}
                </div>
            }
          </div>
        </div>

        {/* Engagement summary */}
        <div className="mt-8 bg-bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-5">Engagement Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Avg plays / song',   value: stats?.totalSongs ? ((stats.totalStreams || 0) / stats.totalSongs).toFixed(1) : '—' },
              { label: 'Downloads / stream', value: stats?.totalStreams ? ((stats.totalDownloads || 0) / stats.totalStreams * 100).toFixed(1) + '%' : '—' },
              { label: 'Artists / users',    value: stats?.totalUsers ? ((stats.totalArtists || 0) / stats.totalUsers * 100).toFixed(1) + '%' : '—' },
              { label: 'Orders / users',     value: stats?.totalUsers ? ((stats.totalOrders || 0) / stats.totalUsers * 100).toFixed(1) + '%' : '—' },
            ].map(m => (
              <div key={m.label}>
                <p className="text-xl font-bold text-text-primary">{m.value}</p>
                <p className="text-xs text-text-muted mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
