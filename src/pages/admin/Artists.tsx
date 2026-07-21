import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mic2 } from 'lucide-react'
import { getAllArtists } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export default function AdminArtists() {
  const location = useLocation()
  const { data: artists = [], isLoading } = useQuery({ queryKey: ['admin-artists'], queryFn: () => getAllArtists() })

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Artists</h1>
          <span className="text-sm text-text-muted">{artists.length} registered</span>
        </div>
        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : artists.length === 0
            ? <EmptyState icon={<Mic2 size={28} className="text-text-muted" />} title="No artists yet" />
            : <div className="space-y-3">
                {artists.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl">
                    {a.profiles?.avatar_url ? <img src={a.profiles.avatar_url} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand font-bold">{(a.artist_name || a.profiles?.full_name || 'A')[0].toUpperCase()}</div>}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{a.artist_name || a.profiles?.full_name}</p>
                      <p className="text-xs text-text-muted">{a.profiles?.email} · {a.genre || 'No genre'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-muted">Joined {formatDate(a.created_at)}</p>
                      <p className="text-xs text-brand">{a.location || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
