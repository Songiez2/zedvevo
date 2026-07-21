import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Disc } from 'lucide-react'
import { getAllAlbumsAdmin, deleteAlbumAdmin } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export default function AdminAlbums() {
  const location = useLocation()
  const qc = useQueryClient()
  const { data: albums = [], isLoading } = useQuery({ queryKey: ['admin-albums'], queryFn: () => getAllAlbumsAdmin() })

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this album and all its songs?')) return
    await deleteAlbumAdmin(id)
    qc.invalidateQueries({ queryKey: ['admin-albums'] })
  }

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Albums</h1>
          <span className="text-sm text-text-muted">{albums.length} total</span>
        </div>

        {isLoading
          ? <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-bg-card animate-pulse rounded-2xl" />
              ))}
            </div>
          : albums.length === 0
            ? <EmptyState icon={<Disc size={28} className="text-text-muted" />} title="No albums yet" />
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4 font-medium">Album</th>
                      <th className="text-left py-3 pr-4 font-medium hidden sm:table-cell">Artist</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Songs</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Uploaded</th>
                      <th className="text-left py-3 font-medium">Status</th>
                      <th className="py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {albums.map((a: any) => (
                      <tr key={a.id} className="hover:bg-bg-card/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            {a.cover_url
                              ? <img src={a.cover_url} alt={a.title} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                              : <div className="w-9 h-9 rounded-xl bg-brand/20 flex items-center justify-center flex-shrink-0">
                                  <Disc size={14} className="text-brand" />
                                </div>
                            }
                            <div className="min-w-0">
                              <p className="font-medium text-text-primary truncate max-w-[140px]">{a.title}</p>
                              {a.genre && <p className="text-xs text-text-muted">{a.genre}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-text-muted hidden sm:table-cell">
                          {a.profiles?.full_name || a.profiles?.username || '—'}
                        </td>
                        <td className="py-3 pr-4 text-text-muted hidden md:table-cell">
                          {Array.isArray(a.songs) ? a.songs.length : 0}
                        </td>
                        <td className="py-3 pr-4 text-text-muted hidden md:table-cell">
                          {formatDate(a.created_at)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${a.published ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                            {a.published ? 'Live' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
