import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Disc, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistAlbums, createAlbum, deleteAlbum, uploadCoverImage } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export default function ArtistAlbums() {
  const location = useLocation()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const { data: albums = [], isLoading } = useQuery({
    queryKey: ['artist-albums', profile?.id],
    queryFn: () => getArtistAlbums(profile!.id),
    enabled: !!profile,
  })

  const handleCreate = async () => {
    if (!profile || !title.trim()) return
    setLoading(true)
    let coverUrl: string | null = null
    if (coverFile) coverUrl = await uploadCoverImage('albums', profile.id, coverFile)
    await createAlbum({ artist_id: profile.id, title: title.trim(), description: description || null, cover_url: coverUrl, genre: genre || null, is_premium: false, price: null, published: true })
    setMsg('Album created!'); setTitle(''); setDescription(''); setGenre(''); setCoverFile(null); setCreating(false); setLoading(false)
    qc.invalidateQueries({ queryKey: ['artist-albums'] })
    setTimeout(() => setMsg(''), 3000)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this album?')) return
    await deleteAlbum(id); qc.invalidateQueries({ queryKey: ['artist-albums'] })
  }

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Albums</h1>
          <button onClick={() => setCreating(v => !v)} className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={15} /> New Album
          </button>
        </div>

        {creating && (
          <div className="mb-6 p-5 bg-bg-card border border-border rounded-2xl space-y-4 max-w-lg">
            <h3 className="text-sm font-semibold text-text-primary">Create New Album</h3>
            {[{ label: 'Title *', val: title, set: setTitle, ph: 'Album title' }, { label: 'Genre', val: genre, set: setGenre, ph: 'e.g. Afrobeats' }].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-medium text-text-muted mb-1">{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional description" className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand resize-none placeholder:text-text-muted" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Cover Image</label>
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border hover:border-brand rounded-xl cursor-pointer transition-colors text-sm text-text-muted">
                {coverFile ? coverFile.name : 'Choose cover image'}
                <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
            {msg && <p className="text-sm text-success">{msg}</p>}
            <button onClick={handleCreate} disabled={loading || !title.trim()} className="flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors">
              {loading && <Loader2 size={14} className="animate-spin" />} Create Album
            </button>
          </div>
        )}

        {isLoading
          ? <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="aspect-square bg-bg-card animate-pulse rounded-2xl" />)}</div>
          : albums.length === 0
            ? <EmptyState icon={<Disc size={28} className="text-text-muted" />} title="No albums yet" description="Create an album to organise your songs." />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {albums.map(a => (
                  <div key={a.id} className="group bg-bg-card border border-border rounded-2xl overflow-hidden">
                    {a.cover_url ? <img src={a.cover_url} alt={a.title} className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-bg-secondary flex items-center justify-center"><Disc size={28} className="text-text-muted" /></div>}
                    <div className="p-3">
                      <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{(a.songs as any)?.length || 0} songs · {formatDate(a.created_at)}</p>
                      <button onClick={() => handleDelete(a.id)} className="mt-2 p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
