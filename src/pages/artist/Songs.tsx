import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Eye, EyeOff, Music, Pencil, Check, X, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistSongs, deleteSong, updateSong, uploadCoverImage } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDuration, formatCurrency } from '@/lib/utils'
import type { Song } from '@/types/types'

interface EditState { title: string; genre: string; coverFile: File | null; coverPreview: string | null }

export default function ArtistSongs() {
  const location = useLocation()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: '', genre: '', coverFile: null, coverPreview: null })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ['artist-songs', profile?.id],
    queryFn: () => getArtistSongs(profile!.id),
    enabled: !!profile,
  })

  const startEdit = (s: Song) => {
    setEditId(s.id)
    setEditState({ title: s.title, genre: s.genre || '', coverFile: null, coverPreview: s.cover_url })
  }

  const cancelEdit = () => { setEditId(null); setEditState({ title: '', genre: '', coverFile: null, coverPreview: null }) }

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditState(p => ({ ...p, coverFile: file, coverPreview: URL.createObjectURL(file) }))
  }

  const handleSave = async (id: string) => {
    if (!profile) return
    setSaving(true)
    try {
      let coverUrl: string | undefined
      if (editState.coverFile) {
        const url = await uploadCoverImage('albums', profile.id, editState.coverFile)
        if (url) coverUrl = url
      }
      await updateSong(id, {
        title: editState.title.trim() || undefined,
        genre: editState.genre.trim() || null,
        ...(coverUrl ? { cover_url: coverUrl } : {}),
      })
      qc.invalidateQueries({ queryKey: ['artist-songs'] })
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteSong(id)
    qc.invalidateQueries({ queryKey: ['artist-songs'] })
    setDeleteConfirm(null)
  }

  const handleTogglePublish = async (id: string, current: boolean) => {
    await updateSong(id, { published: !current })
    qc.invalidateQueries({ queryKey: ['artist-songs'] })
  }

  const inputCls = 'bg-bg-secondary border border-border rounded-lg px-2 py-1 text-xs text-text-primary outline-none focus:border-brand transition-colors'

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-6">My Songs</h1>

        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : songs.length === 0
            ? <EmptyState icon={<Music size={28} className="text-text-muted" />} title="No songs uploaded yet" description="Go to Upload to add your first song." />
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4 font-medium">Song</th>
                      <th className="text-left py-3 pr-4 font-medium hidden sm:table-cell">Genre</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Duration</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Plays</th>
                      <th className="text-left py-3 pr-4 font-medium">Status</th>
                      <th className="text-left py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {songs.map(s => (
                      <tr key={s.id} className="hover:bg-bg-card/50 transition-colors">
                        {editId === s.id ? (
                          /* ── inline edit row ── */
                          <>
                            <td className="py-3 pr-4" colSpan={2}>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Cover change */}
                                <div className="relative flex-shrink-0 cursor-pointer" onClick={() => coverInputRef.current?.click()}>
                                  {editState.coverPreview
                                    ? <img src={editState.coverPreview} alt="" className="w-9 h-9 rounded-lg object-cover" />
                                    : <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center"><Music size={14} className="text-brand" /></div>
                                  }
                                  <div className="absolute inset-0 rounded-lg bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <Upload size={10} className="text-white" />
                                  </div>
                                  <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                                </div>
                                <input value={editState.title} onChange={e => setEditState(p => ({ ...p, title: e.target.value }))}
                                  className={`${inputCls} w-36`} placeholder="Title" />
                                <input value={editState.genre} onChange={e => setEditState(p => ({ ...p, genre: e.target.value }))}
                                  className={`${inputCls} w-28 hidden sm:block`} placeholder="Genre" />
                              </div>
                            </td>
                            <td className="py-3 pr-4 hidden md:table-cell" />
                            <td className="py-3 pr-4 hidden md:table-cell" />
                            <td className="py-3 pr-4" />
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleSave(s.id)} disabled={saving}
                                  className="p-1.5 text-success hover:text-success/80 rounded-lg transition-colors" title="Save">
                                  <Check size={14} />
                                </button>
                                <button onClick={cancelEdit} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors" title="Cancel">
                                  <X size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : deleteConfirm === s.id ? (
                          /* ── delete confirm row ── */
                          <>
                            <td className="py-3 pr-4" colSpan={4}>
                              <span className="text-xs text-danger">Delete "{s.title}"? This cannot be undone.</span>
                            </td>
                            <td className="py-3 pr-4" />
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handleDelete(s.id)}
                                  className="px-2.5 py-1 text-xs bg-danger text-white rounded-lg hover:bg-danger/80 transition-colors">
                                  Delete
                                </button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="px-2.5 py-1 text-xs bg-bg-secondary border border-border text-text-secondary rounded-lg hover:text-text-primary transition-colors">
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          /* ── normal row ── */
                          <>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                {s.cover_url
                                  ? <img src={s.cover_url} alt={s.title} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                  : <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0"><Music size={12} className="text-brand" /></div>
                                }
                                <div>
                                  <p className="font-medium text-text-primary truncate max-w-[150px]">{s.title}</p>
                                  {s.is_premium && <p className="text-xs text-warning">{formatCurrency(s.price || 0)}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-text-muted hidden sm:table-cell">{s.genre || '—'}</td>
                            <td className="py-3 pr-4 text-text-muted hidden md:table-cell">{s.duration ? formatDuration(s.duration) : '—'}</td>
                            <td className="py-3 pr-4 text-text-muted hidden md:table-cell">{s.plays || 0}</td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.published ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                                {s.published ? 'Live' : 'Draft'}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => startEdit(s)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors" title="Edit">
                                  <Pencil size={14} />
                                </button>
                                <button onClick={() => handleTogglePublish(s.id, s.published)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors" title={s.published ? 'Unpublish' : 'Publish'}>
                                  {s.published ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button onClick={() => setDeleteConfirm(s.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
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
