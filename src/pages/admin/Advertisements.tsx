import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus, Pencil, Trash2, Loader2, Check, X, Eye, EyeOff, Upload } from 'lucide-react'
import { getAdvertisements, createAdvertisement, updateAdvertisement, deleteAdvertisement, uploadAdImage } from '@/db/api'
import type { Advertisement } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

const blank = (): Partial<Advertisement> => ({ title: '', image_url: null, link_url: null, placement: 'banner', active: true, starts_at: null, ends_at: null })

const PLACEMENTS = ['banner', 'sidebar', 'popup']

export default function AdminAdvertisements() {
  const location = useLocation()
  const qc = useQueryClient()
  const { data: ads = [], isLoading } = useQuery({ queryKey: ['admin-ads'], queryFn: () => getAdvertisements(true) })
  const [form, setForm] = useState<Partial<Advertisement>>(blank())
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const ic = (k: keyof Advertisement, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const url = await uploadAdImage(file)
    if (url) ic('image_url', url)
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!form.title?.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      if (editId) {
        await updateAdvertisement(editId, form)
      } else {
        await createAdvertisement({ title: form.title!, image_url: form.image_url ?? null, link_url: form.link_url ?? null, placement: form.placement ?? 'banner', active: form.active ?? true, starts_at: form.starts_at ?? null, ends_at: form.ends_at ?? null })
      }
      qc.invalidateQueries({ queryKey: ['admin-ads'] })
      setForm(blank()); setEditId(null); setShowForm(false)
    } catch { setError('Failed to save') }
    setSaving(false)
  }

  const startEdit = (ad: Advertisement) => { setEditId(ad.id); setForm(ad); setShowForm(true) }
  const cancelEdit = () => { setEditId(null); setForm(blank()); setError(''); setShowForm(false) }

  const toggleActive = async (ad: Advertisement) => {
    await updateAdvertisement(ad.id, { active: !ad.active })
    qc.invalidateQueries({ queryKey: ['admin-ads'] })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this advertisement?')) return
    await deleteAdvertisement(id)
    qc.invalidateQueries({ queryKey: ['admin-ads'] })
  }

  const inputCls = 'w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors'

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-text-primary">Advertisements</h1>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={15} /> New Ad
          </button>
        </div>
        <p className="text-sm text-text-muted mb-8">Manage platform banners, sidebars, and popup advertisements</p>

        {/* Form */}
        {showForm && (
          <div className="bg-bg-card border border-border rounded-2xl p-5 mb-8">
            <h2 className="text-sm font-semibold text-text-secondary mb-4">{editId ? 'Edit Advertisement' : 'New Advertisement'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.title ?? ''} onChange={e => ic('title', e.target.value)} placeholder="Ad title *" className={inputCls} />
              <input value={form.link_url ?? ''} onChange={e => ic('link_url', e.target.value)} placeholder="Link URL" className={inputCls} />
              <select value={form.placement ?? 'banner'} onChange={e => ic('placement', e.target.value)} className={inputCls}>
                {PLACEMENTS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active ?? true} onChange={e => ic('active', e.target.checked)} className="accent-brand" />
                  <span className="text-sm text-text-secondary">Active</span>
                </label>
              </div>
              <input type="datetime-local" value={form.starts_at?.slice(0, 16) ?? ''} onChange={e => ic('starts_at', e.target.value || null)} className={inputCls} />
              <input type="datetime-local" value={form.ends_at?.slice(0, 16) ?? ''} onChange={e => ic('ends_at', e.target.value || null)} className={inputCls} />
            </div>

            {/* Image upload */}
            <div className="mt-3">
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />
              <div className="flex items-center gap-3">
                {form.image_url
                  ? <img src={form.image_url} alt="" className="h-16 rounded-lg object-cover border border-border" />
                  : <div className="h-16 w-28 rounded-lg bg-bg-secondary border border-border flex items-center justify-center text-text-muted text-xs">No image</div>
                }
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary text-xs rounded-lg transition-colors">
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload Image
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-danger mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editId ? 'Save Changes' : 'Create Ad'}
              </button>
              <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary text-sm rounded-lg hover:bg-bg-secondary transition-colors">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : ads.length === 0
            ? <EmptyState icon={<Megaphone size={28} className="text-text-muted" />} title="No advertisements yet" description="Create your first ad to promote content on the platform" />
            : <div className="space-y-3">
                {ads.map(ad => (
                  <div key={ad.id} className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl">
                    {ad.image_url
                      ? <img src={ad.image_url} alt="" className="w-16 h-10 rounded-lg object-cover flex-shrink-0 border border-border" />
                      : <div className="w-16 h-10 rounded-lg bg-bg-secondary flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{ad.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-text-muted capitalize">{ad.placement}</span>
                        <span className="text-[11px] text-text-muted">·</span>
                        <span className="text-[11px] text-text-muted">{ad.impressions.toLocaleString()} impressions · {ad.clicks} clicks</span>
                        <span className="text-[11px] text-text-muted">· {formatDate(ad.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleActive(ad)} title={ad.active ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg transition-colors ${ad.active ? 'text-success hover:bg-success/10' : 'text-text-muted hover:bg-bg-secondary'}`}>
                        {ad.active ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                      <button onClick={() => startEdit(ad)} className="p-1.5 text-text-muted hover:text-brand rounded-lg hover:bg-brand/10 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(ad.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors">
                        <Trash2 size={15} />
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
