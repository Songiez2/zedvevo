import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Plus, Pencil, Trash2, Loader2, Check, X, Upload, ExternalLink } from 'lucide-react'
import { getSponsors, createSponsor, updateSponsor, deleteSponsor, uploadSponsorLogo } from '@/db/api'
import type { Sponsor } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'

const blank = (): Partial<Sponsor> => ({ name: '', logo_url: null, website_url: null, tier: 'silver', sort_order: 0, active: true })
const TIERS = [{ v: 'gold', label: 'Gold', cls: 'text-yellow-500 bg-yellow-500/10' }, { v: 'silver', label: 'Silver', cls: 'text-slate-400 bg-slate-400/10' }, { v: 'bronze', label: 'Bronze', cls: 'text-orange-500 bg-orange-500/10' }]

export default function AdminSponsors() {
  const location = useLocation()
  const qc = useQueryClient()
  const { data: sponsors = [], isLoading } = useQuery({ queryKey: ['admin-sponsors'], queryFn: () => getSponsors(true) })
  const [form, setForm] = useState<Partial<Sponsor>>(blank())
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const ic = (k: keyof Sponsor, v: unknown) => setForm(p => ({ ...p, [k]: v }))

  const handleLogoUpload = async (file: File) => {
    setUploading(true)
    const url = await uploadSponsorLogo(file)
    if (url) ic('logo_url', url)
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      if (editId) {
        await updateSponsor(editId, form)
      } else {
        await createSponsor({ name: form.name!, logo_url: form.logo_url ?? null, website_url: form.website_url ?? null, tier: form.tier ?? 'silver', sort_order: form.sort_order ?? 0, active: form.active ?? true })
      }
      qc.invalidateQueries({ queryKey: ['admin-sponsors'] })
      setForm(blank()); setEditId(null); setShowForm(false)
    } catch { setError('Failed to save') }
    setSaving(false)
  }

  const startEdit = (s: Sponsor) => { setEditId(s.id); setForm(s); setShowForm(true) }
  const cancelEdit = () => { setEditId(null); setForm(blank()); setError(''); setShowForm(false) }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sponsor?')) return
    await deleteSponsor(id)
    qc.invalidateQueries({ queryKey: ['admin-sponsors'] })
  }

  const inputCls = 'w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors'

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-text-primary">Sponsors</h1>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-lg transition-colors">
            <Plus size={15} /> Add Sponsor
          </button>
        </div>
        <p className="text-sm text-text-muted mb-8">Manage platform sponsors displayed on the site</p>

        {showForm && (
          <div className="bg-bg-card border border-border rounded-2xl p-5 mb-8">
            <h2 className="text-sm font-semibold text-text-secondary mb-4">{editId ? 'Edit Sponsor' : 'Add Sponsor'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.name ?? ''} onChange={e => ic('name', e.target.value)} placeholder="Sponsor name *" className={inputCls} />
              <input value={form.website_url ?? ''} onChange={e => ic('website_url', e.target.value)} placeholder="Website URL" className={inputCls} />
              <select value={form.tier ?? 'silver'} onChange={e => ic('tier', e.target.value)} className={inputCls}>
                {TIERS.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
              <input type="number" value={form.sort_order ?? 0} onChange={e => ic('sort_order', +e.target.value)} placeholder="Sort order" className={inputCls} />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.active ?? true} onChange={e => ic('active', e.target.checked)} className="accent-brand" />
                <span className="text-sm text-text-secondary">Active</span>
              </label>
            </div>

            {/* Logo upload */}
            <div className="mt-3 flex items-center gap-3">
              {form.logo_url
                ? <img src={form.logo_url} alt="" className="h-12 rounded-lg object-contain border border-border bg-white px-2" />
                : <div className="h-12 w-20 rounded-lg bg-bg-secondary border border-border" />
              }
              <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]) }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary text-xs rounded-lg transition-colors">
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload Logo
              </button>
            </div>

            {error && <p className="text-xs text-danger mt-2">{error}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editId ? 'Save Changes' : 'Add Sponsor'}
              </button>
              <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary text-sm rounded-lg hover:bg-bg-secondary transition-colors">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        )}

        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : sponsors.length === 0
            ? <EmptyState icon={<Award size={28} className="text-text-muted" />} title="No sponsors yet" description="Add sponsors to display on the platform" />
            : <div className="space-y-3">
                {(sponsors as Sponsor[]).map(s => {
                  const tier = TIERS.find(t => t.v === s.tier) ?? TIERS[1]
                  return (
                    <div key={s.id} className="flex items-center gap-4 p-4 bg-bg-card border border-border rounded-xl">
                      {s.logo_url
                        ? <img src={s.logo_url} alt={s.name} className="h-10 w-20 object-contain rounded-lg border border-border bg-white px-2 flex-shrink-0" />
                        : <div className="h-10 w-20 rounded-lg bg-bg-secondary flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary">{s.name}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tier.cls}`}>{tier.label}</span>
                          {!s.active && <span className="text-[10px] text-text-muted bg-bg-secondary px-1.5 py-0.5 rounded-full">Inactive</span>}
                        </div>
                        {s.website_url && (
                          <a href={s.website_url} target="_blank" rel="noreferrer" className="text-xs text-brand flex items-center gap-1 mt-0.5 hover:underline">
                            {s.website_url} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => startEdit(s)} className="p-1.5 text-text-muted hover:text-brand rounded-lg hover:bg-brand/10 transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </div>
                  )
                })}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
