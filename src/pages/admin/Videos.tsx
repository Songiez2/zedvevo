import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Video } from 'lucide-react'
import { getAllVideosAdmin, deleteVideo } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate as _formatDate } from '@/lib/utils'

export default function AdminVideos() {
  const location = useLocation()
  const qc = useQueryClient()
  const { data: videos = [], isLoading } = useQuery({ queryKey: ['admin-videos'], queryFn: () => getAllVideosAdmin() })

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this video?')) return
    await deleteVideo(id); qc.invalidateQueries({ queryKey: ['admin-videos'] })
  }

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Videos</h1>
          <span className="text-sm text-text-muted">{videos.length} total</span>
        </div>
        {isLoading
          ? <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-video bg-bg-card animate-pulse rounded-2xl" />)}</div>
          : videos.length === 0
            ? <EmptyState icon={<Video size={28} className="text-text-muted" />} title="No videos yet" />
            : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {videos.map((v: any) => (
                  <div key={v.id} className="group bg-bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="relative aspect-video bg-bg-secondary">
                      {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video size={24} className="text-text-muted" /></div>}
                      <button onClick={() => handleDelete(v.id)} className="absolute top-2 right-2 p-1.5 bg-danger/80 hover:bg-danger text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-text-primary truncate">{v.title}</p>
                      <p className="text-xs text-text-muted">{v.profiles?.full_name || 'Unknown'} · {v.plays || 0} plays</p>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
