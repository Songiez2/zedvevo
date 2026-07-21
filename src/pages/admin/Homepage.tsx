import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Plus, Trash2, Loader2, Check, X, Upload, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'
import {
  getHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide, uploadHeroImage,
  getFeaturedContent, addFeaturedContent, removeFeaturedContent,
  getPublishedSongs, getPublishedVideos, getArtists,
} from '@/db/api'
import type { HeroSlide, FeaturedContent } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'

const blankSlide = (): Partial<HeroSlide> => ({ title: '', subtitle: null, image_url: null, link_url: null, link_label: null, sort_order: 0, active: true })

const SECTIONS = [
  { key: 'songs',    label: 'Featured Songs' },
  { key: 'videos',   label: 'Featured Videos' },
  { key: 'artists',  label: 'Featured Artists' },
]

export default function AdminHomepage() {
  const location = useLocation()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'hero' | 'featured'>('hero')
  const [featSection, setFeatSection] = useState('songs')
  const [slideForm, setSlideForm] = useState<Partial<HeroSlide>>(blankSlide())
  const [editSlideId, setEditSlideId] = useState<string | null>(null)
  const [showSlideForm, setShowSlideForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [contentId, setContentId] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: slides = [] } = useQuery({ queryKey: ['hero-slides'], queryFn: getHeroSlides })
  const { data: featured = [] } = useQuery({ queryKey: ['featured', featSection], queryFn: () => getFeaturedContent(featSection) })
  const { data: songs = [] } = useQuery({ queryKey: ['published-songs-sm'], queryFn: () => getPublishedSongs(50) })
  const { data: videos = [] } = useQuery({ queryKey: ['published-videos-sm'], queryFn: () => getPublishedVideos(50) })
  const { data: artistsList = [] } = useQuery({ queryKey: ['artists-list'], queryFn: () => getArtists(50) })

  const contentOptions = featSection === 'songs' ? songs : featSection === 'videos' ? videos : artistsList

  const is = (k: keyof HeroSlide, v: unknown) => setSlideForm(p => ({ ...p, [k]: v }))

  const handleImageUpload = async (file: File) => {
    setUploading(true)
    const url = await uploadHeroImage(file)
    if (url) is('image_url', url)
    setUploading(false)
  }

  const handleSlideSubmit = async () => {
    if (!slideForm.title?.trim()) { setError('Title is required'); return }
    setSaving(true); setError('')
    try {
      if (editSlideId) {
        await updateHeroSlide(editSlideId, slideForm)
      } else {
        await createHeroSlide({ title: slideForm.title!, subtitle: slideForm.subtitle ?? null, image_url: slideForm.image_url ?? null, link_url: slideForm.link_url ?? null, link_label: slideForm.link_label ?? null, sort_order: slideForm.sort_order ?? 0, active: slideForm.active ?? true })
      }
      qc.invalidateQueries({ queryKey: ['hero-slides'] })
      setSlideForm(blankSlide()); setEditSlideId(null); setShowSlideForm(false)
    } catch { setError('Failed to save') }
    setSaving(false)
  }

  const startEditSlide = (s: HeroSlide) => { setEditSlideId(s.id); setSlideForm(s); setShowSlideForm(true) }
  const cancelSlide = () => { setEditSlideId(null); setSlideForm(blankSlide()); setError(''); setShowSlideForm(false) }

  const toggleSlideActive = async (s: HeroSlide) => {
    await updateHeroSlide(s.id, { active: !s.active })
    qc.invalidateQueries({ queryKey: ['hero-slides'] })
  }

  const moveSlide = async (s: HeroSlide, dir: 'up' | 'down') => {
    const order = dir === 'up' ? Math.max(0, s.sort_order - 1) : s.sort_order + 1
    await updateHeroSlide(s.id, { sort_order: order })
    qc.invalidateQueries({ queryKey: ['hero-slides'] })
  }

  const handleDeleteSlide = async (id: string) => {
    if (!confirm('Delete this slide?')) return
    await deleteHeroSlide(id)
    qc.invalidateQueries({ queryKey: ['hero-slides'] })
  }

  const handleAddFeatured = async () => {
    if (!contentId) return
    try {
      await addFeaturedContent(featSection, contentId)
      qc.invalidateQueries({ queryKey: ['featured', featSection] })
      setContentId('')
    } catch { /* already featured */ }
  }

  const handleRemoveFeatured = async (id: string) => {
    await removeFeaturedContent(id)
    qc.invalidateQueries({ queryKey: ['featured', featSection] })
  }

  const inputCls = 'w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors'

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Layers size={20} className="text-brand" />
          <h1 className="text-xl font-bold text-text-primary">Homepage Management</h1>
        </div>
        <p className="text-sm text-text-muted mb-6">Configure the hero slider and featured content sections</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1 w-fit mb-8">
          {[{ v: 'hero', label: 'Hero Slider' }, { v: 'featured', label: 'Featured Content' }].map(t => (
            <button key={t.v} onClick={() => setTab(t.v as 'hero' | 'featured')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.v ? 'bg-brand text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── HERO SLIDER ─── */}
        {tab === 'hero' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-text-secondary">Hero Slides ({slides.length})</h2>
              <button onClick={() => setShowSlideForm(s => !s)}
                className="flex items-center gap-2 px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-medium rounded-lg transition-colors">
                <Plus size={13} /> Add Slide
              </button>
            </div>

            {showSlideForm && (
              <div className="bg-bg-card border border-border rounded-2xl p-5 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input value={slideForm.title ?? ''} onChange={e => is('title', e.target.value)} placeholder="Slide title *" className={inputCls} />
                  <input value={slideForm.subtitle ?? ''} onChange={e => is('subtitle', e.target.value)} placeholder="Subtitle" className={inputCls} />
                  <input value={slideForm.link_url ?? ''} onChange={e => is('link_url', e.target.value)} placeholder="Button link URL" className={inputCls} />
                  <input value={slideForm.link_label ?? ''} onChange={e => is('link_label', e.target.value)} placeholder="Button label" className={inputCls} />
                  <input type="number" value={slideForm.sort_order ?? 0} onChange={e => is('sort_order', +e.target.value)} placeholder="Sort order" className={inputCls} />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={slideForm.active ?? true} onChange={e => is('active', e.target.checked)} className="accent-brand" />
                    <span className="text-sm text-text-secondary">Active</span>
                  </label>
                </div>

                {/* Image */}
                <div className="mt-3 flex items-center gap-3">
                  {slideForm.image_url
                    ? <img src={slideForm.image_url} alt="" className="h-16 rounded-lg object-cover border border-border" />
                    : <div className="h-16 w-28 rounded-lg bg-bg-secondary border border-border" />
                  }
                  <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary text-xs rounded-lg transition-colors">
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload Image
                  </button>
                </div>

                {error && <p className="text-xs text-danger mt-2">{error}</p>}
                <div className="flex gap-2 mt-4">
                  <button onClick={handleSlideSubmit} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {editSlideId ? 'Save' : 'Create Slide'}
                  </button>
                  <button onClick={cancelSlide} className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary text-sm rounded-lg hover:bg-bg-secondary transition-colors">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            )}

            {slides.length === 0
              ? <EmptyState icon={<Layers size={28} className="text-text-muted" />} title="No slides yet" />
              : <div className="space-y-3">
                  {(slides as HeroSlide[]).map(s => (
                    <div key={s.id} className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl">
                      {s.image_url
                        ? <img src={s.image_url} alt="" className="w-20 h-12 object-cover rounded-lg border border-border flex-shrink-0" />
                        : <div className="w-20 h-12 rounded-lg bg-bg-secondary flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{s.title}</p>
                        {s.subtitle && <p className="text-xs text-text-muted truncate">{s.subtitle}</p>}
                        <p className="text-[11px] text-text-muted mt-0.5">Order: {s.sort_order} · {s.active ? 'Active' : 'Hidden'}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => moveSlide(s, 'up')} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-secondary transition-colors"><ArrowUp size={14} /></button>
                        <button onClick={() => moveSlide(s, 'down')} className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-secondary transition-colors"><ArrowDown size={14} /></button>
                        <button onClick={() => toggleSlideActive(s)} className={`p-1.5 rounded-lg transition-colors ${s.active ? 'text-success hover:bg-success/10' : 'text-text-muted hover:bg-bg-secondary'}`}>
                          {s.active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button onClick={() => startEditSlide(s)} className="p-1.5 text-text-muted hover:text-brand rounded-lg hover:bg-brand/10 transition-colors"><Plus size={14} /></button>
                        <button onClick={() => handleDeleteSlide(s.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ─── FEATURED CONTENT ─── */}
        {tab === 'featured' && (
          <div>
            {/* Section selector */}
            <div className="flex gap-2 mb-6">
              {SECTIONS.map(s => (
                <button key={s.key} onClick={() => setFeatSection(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${featSection === s.key ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-secondary hover:text-text-primary hover:bg-bg-card'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Add featured */}
            <div className="flex gap-2 mb-6">
              <select value={contentId} onChange={e => setContentId(e.target.value)}
                className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand">
                <option value="">Select {featSection === 'artists' ? 'artist' : featSection.slice(0, -1)} to feature…</option>
                {(contentOptions as any[]).map(item => (
                  <option key={item.id} value={item.id}>
                    {featSection === 'artists' ? (item.artist_name || item.profile?.full_name || item.id) : item.title}
                  </option>
                ))}
              </select>
              <button onClick={handleAddFeatured} disabled={!contentId}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                <Plus size={14} /> Add
              </button>
            </div>

            {featured.length === 0
              ? <EmptyState title={`No featured ${featSection} yet`} />
              : <div className="space-y-2">
                  {(featured as FeaturedContent[]).map(f => (
                    <div key={f.id} className="flex items-center justify-between p-3 bg-bg-card border border-border rounded-xl">
                      <div>
                        <p className="text-xs text-text-muted font-mono">{f.content_id}</p>
                        <p className="text-[11px] text-text-muted">Order: {f.sort_order} · {f.active ? 'Active' : 'Hidden'}</p>
                      </div>
                      <button onClick={() => handleRemoveFeatured(f.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
