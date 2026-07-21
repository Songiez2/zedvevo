import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Tag, Loader2, Check, X } from 'lucide-react'
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import type { Category } from '@/types/types'

const blank = (): Partial<Category> => ({ name: '', slug: '', icon: '', sort_order: 0 })
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function AdminCategories() {
  const location = useLocation()
  const qc = useQueryClient()
  const { data: categories = [], isLoading } = useQuery({ queryKey: ['admin-categories'], queryFn: getAllCategories })

  const [form, setForm] = useState<Partial<Category>>(blank())
  const [editId, setEditId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ic = (k: keyof Category, v: string | number) => {
    setForm(p => ({
      ...p, [k]: v,
      ...(k === 'name' && !editId ? { slug: toSlug(v as string) } : {}),
    }))
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      if (editId) {
        await updateCategory(editId, form)
      } else {
        await createCategory({ name: form.name!, slug: form.slug || toSlug(form.name!), icon: form.icon ?? null, sort_order: form.sort_order ?? 0 })
      }
      qc.invalidateQueries({ queryKey: ['admin-categories'] })
      setForm(blank()); setEditId(null)
    } catch { setError('Failed to save category') }
    setSaving(false)
  }

  const startEdit = (c: Category) => { setEditId(c.id); setForm({ name: c.name, slug: c.slug, icon: c.icon ?? '', sort_order: c.sort_order }) }
  const cancelEdit = () => { setEditId(null); setForm(blank()); setError('') }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return
    await deleteCategory(id)
    qc.invalidateQueries({ queryKey: ['admin-categories'] })
  }

  const inputCls = 'bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors'

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-1">Categories</h1>
        <p className="text-sm text-text-muted mb-8">Manage music and content categories</p>

        {/* Form */}
        <div className="bg-bg-card border border-border rounded-2xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-text-secondary mb-4">{editId ? 'Edit Category' : 'New Category'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input value={form.name ?? ''} onChange={e => ic('name', e.target.value)} placeholder="Name" className={inputCls} />
            <input value={form.slug ?? ''} onChange={e => ic('slug', e.target.value)} placeholder="slug" className={inputCls} />
            <input value={form.icon ?? ''} onChange={e => ic('icon', e.target.value)} placeholder="Icon (emoji)" className={inputCls} />
            <input type="number" value={form.sort_order ?? 0} onChange={e => ic('sort_order', +e.target.value)} placeholder="Order" className={inputCls} />
          </div>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {editId ? 'Save Changes' : 'Create Category'}
            </button>
            {editId && (
              <button onClick={cancelEdit} className="flex items-center gap-2 px-4 py-2 border border-border text-text-secondary text-sm rounded-lg hover:bg-bg-secondary transition-colors">
                <X size={14} /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {isLoading
          ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : categories.length === 0
            ? <EmptyState icon={<Tag size={28} className="text-text-muted" />} title="No categories yet" />
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4 font-medium">Icon</th>
                      <th className="text-left py-3 pr-4 font-medium">Name</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Slug</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Order</th>
                      <th className="text-right py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categories.map(c => (
                      <tr key={c.id} className="hover:bg-bg-card/50 transition-colors">
                        <td className="py-3 pr-4 text-lg">{c.icon ?? '—'}</td>
                        <td className="py-3 pr-4 font-medium text-text-primary">{c.name}</td>
                        <td className="py-3 pr-4 text-text-muted font-mono text-xs hidden md:table-cell">{c.slug}</td>
                        <td className="py-3 pr-4 text-text-muted hidden md:table-cell">{c.sort_order}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => startEdit(c)} className="p-1.5 text-text-muted hover:text-brand transition-colors rounded-lg hover:bg-brand/10">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(c.id)} className="p-1.5 text-text-muted hover:text-danger transition-colors rounded-lg hover:bg-danger/10">
                              <Trash2 size={14} />
                            </button>
                          </div>
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
