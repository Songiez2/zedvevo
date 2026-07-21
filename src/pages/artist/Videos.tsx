import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Eye, EyeOff, Video, Pencil, Check, X, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistVideos, deleteVideo, updateVideo, uploadCoverImage } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import type { Video as VideoType } from '@/types/types'

interface EditState { title: string; thumbFile: File | null; thumbPreview: string | null }

export default function ArtistVideos() {
  const location = useLocation()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: '', thumbFile: null, thumbPreview: null })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['artist-videos', profile?.id],
    queryFn: () => getArtistVideos(profile!.id),
    enabled: !!profile,
  })

  const startEdit = (v: VideoType) => {
    setEditId(v.id)
    setEditState({ title: v.title, thumbFile: null, thumbPreview: v.thumbnail_url })
  }

  const cancelEdit = () => { setEditId(null); setEditState({ title: '', thumbFile: null, thumbPreview: null }) }

  const handleThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditState(p => ({ ...p, thumbFile: file, thumbPreview: URL.createObjectURL(file) }))
  }

  const handleSave = async (id: string) => {
    if (!profile) return
    setSaving(true)
    try {
      let thumbnailUrl: string | undefined
      if (editState.thumbFile) {
        const url = await uploadCoverImage('images', profile.id, editState.thumbFile)
        if (url) thumbnailUrl = url
      }
      await updateVideo(id, {
        title: editState.title.trim() || undefined,
        ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
      })
      qc.invalidateQueries({ queryKey: ['artist-videos'] })
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteVideo(id)
    qc.invalidateQueries({ queryKey: ['artist-videos'] })
    setDeleteConfirm(null)
  }

  const handleToggle = async (id: string, current: boolean) => {
    await updateVideo(id, { published: !current })
    qc.invalidateQueries({ queryKey: ['artist-videos'] })
  }

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-6">My Videos</h1>

        {isLoading
          ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-video bg-bg-card animate-pulse rounded-2xl" />)}
            </div>
          : videos.length === 0
            ? <EmptyState icon={<Video size={28} className="text-text-muted" />} title="No videos uploaded yet" description="Upload your first music video from the Upload page." />
            : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {videos.map(v => (
                  <div key={v.id} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                    {/* Thumbnail — click to change when editing */}
                    <div className="relative aspect-video bg-bg-secondary overflow-hidden">
                      {(editId === v.id ? editState.thumbPreview : v.thumbnail_url)
                        ? <img src={editId === v.id ? (editState.thumbPreview ?? undefined) : (v.thumbnail_url ?? undefined)} alt={v.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Video size={24} className="text-text-muted" /></div>
                      }
                      {editId === v.id && (
                        <button onClick={() => thumbRef.current?.click()}
                          className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1 text-white transition-opacity">
                          <Upload size={20} />
                          <span className="text-xs font-medium">Change Thumbnail</span>
                          <input ref={thumbRef} type="file" accept="image/*" onChange={handleThumbChange} className="hidden" />
                        </button>
                      )}
                    </div>

                    <div className="p-3">
                      {editId === v.id ? (
                        /* ── edit mode ── */
                        <div className="space-y-2">
                          <input
                            value={editState.title}
                            onChange={e => setEditState(p => ({ ...p, title: e.target.value }))}
                            className="w-full bg-bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary outline-none focus:border-brand transition-colors"
                            placeholder="Video title"
                          />
                          <div className="flex gap-1.5">
                            <button onClick={() => handleSave(v.id)} disabled={saving}
                              className="flex items-center gap-1 px-3 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                              <Check size={12} /> {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={cancelEdit}
                              className="flex items-center gap-1 px-3 py-1.5 bg-bg-secondary border border-border text-text-secondary text-xs rounded-lg hover:text-text-primary transition-colors">
                              <X size={12} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : deleteConfirm === v.id ? (
                        /* ── delete confirm ── */
                        <div className="space-y-2">
                          <p className="text-xs text-danger font-medium">Delete this video?</p>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDelete(v.id)}
                              className="px-3 py-1.5 text-xs bg-danger text-white rounded-lg hover:bg-danger/80 transition-colors">Delete</button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 text-xs bg-bg-secondary border border-border text-text-secondary rounded-lg hover:text-text-primary transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        /* ── normal view ── */
                        <>
                          <p className="text-sm font-medium text-text-primary truncate mb-1">{v.title}</p>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${v.published ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                              {v.published ? 'Live' : 'Draft'}
                            </span>
                            {v.is_premium && <span className="text-xs text-warning font-medium">{formatCurrency(v.price || 0)}</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <button onClick={() => startEdit(v)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors" title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleToggle(v.id, v.published)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors" title={v.published ? 'Unpublish' : 'Publish'}>
                              {v.published ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button onClick={() => setDeleteConfirm(v.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
