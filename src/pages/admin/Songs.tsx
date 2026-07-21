import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Music } from 'lucide-react'
import { getAllSongsAdmin, deleteSong } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate as _formatDate } from '@/lib/utils'

export default function AdminSongs() {
  const location = useLocation()
  const qc = useQueryClient()
  const { data: songs = [], isLoading } = useQuery({ queryKey: ['admin-songs'], queryFn: () => getAllSongsAdmin() })

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this song?')) return
    await deleteSong(id); qc.invalidateQueries({ queryKey: ['admin-songs'] })
  }

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Songs</h1>
          <span className="text-sm text-text-muted">{songs.length} total</span>
        </div>
        {isLoading
          ? <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : songs.length === 0
            ? <EmptyState icon={<Music size={28} className="text-text-muted" />} title="No songs uploaded yet" />
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4 font-medium">Song</th>
                      <th className="text-left py-3 pr-4 font-medium hidden sm:table-cell">Artist</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Genre</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Plays</th>
                      <th className="text-left py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {songs.map((s: any) => (
                      <tr key={s.id} className="hover:bg-bg-card/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            {s.cover_url ? <img src={s.cover_url} alt="" className="w-8 h-8 rounded-lg object-cover" /> : <div className="w-8 h-8 rounded-lg bg-brand/20 flex items-center justify-center"><Music size={12} className="text-brand" /></div>}
                            <p className="font-medium text-text-primary truncate max-w-[140px]">{s.title}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-text-muted hidden sm:table-cell">{s.profiles?.full_name || s.profiles?.username || '—'}</td>
                        <td className="py-3 pr-4 text-text-muted hidden md:table-cell">{s.genre || '—'}</td>
                        <td className="py-3 pr-4 text-text-muted hidden md:table-cell">{s.plays || 0}</td>
                        <td className="py-3 pr-4"><span className={`text-xs px-2 py-1 rounded-full ${s.published ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>{s.published ? 'Live' : 'Draft'}</span></td>
                        <td className="py-3"><button onClick={() => handleDelete(s.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors"><Trash2 size={14} /></button></td>
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
