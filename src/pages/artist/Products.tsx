import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Eye, EyeOff, ShoppingBag, Pencil, Check, X, Upload, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistProducts, updateProduct, deleteProduct } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/types'
import { Link } from 'react-router-dom'
import { uploadCoverImage } from '@/db/api'

interface EditState { title: string; price: number; imageFile: File | null; imagePreview: string | null }

export default function ArtistProducts() {
  const location = useLocation()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: '', price: 0, imageFile: null, imagePreview: null })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['artist-products', profile?.id],
    queryFn: () => getArtistProducts(profile!.id),
    enabled: !!profile,
  })

  const startEdit = (p: Product) => {
    setEditId(p.id)
    setEditState({ title: p.title, price: p.price, imageFile: null, imagePreview: p.images?.[0] ?? null })
  }
  const cancelEdit = () => { setEditId(null); setEditState({ title: '', price: 0, imageFile: null, imagePreview: null }) }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditState(p => ({ ...p, imageFile: file, imagePreview: URL.createObjectURL(file) }))
  }

  const handleSave = async (p: Product) => {
    if (!profile) return
    setSaving(true)
    try {
      let images = p.images
      if (editState.imageFile) {
        const url = await uploadCoverImage('products', profile.id, editState.imageFile)
        if (url) images = [url, ...images.slice(1)]
      }
      await updateProduct(p.id, {
        title: editState.title.trim() || p.title,
        price: editState.price || p.price,
        images,
      })
      qc.invalidateQueries({ queryKey: ['artist-products'] })
      cancelEdit()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    await deleteProduct(id)
    qc.invalidateQueries({ queryKey: ['artist-products'] })
    setDeleteConfirm(null)
  }

  const handleToggle = async (p: Product) => {
    await updateProduct(p.id, { published: !p.published })
    qc.invalidateQueries({ queryKey: ['artist-products'] })
  }

  const inputCls = 'bg-bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary outline-none focus:border-brand transition-colors'

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">My Products</h1>
          <Link to="/artist/upload"
            className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={15} /> Add Product
          </Link>
        </div>

        {isLoading
          ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square bg-bg-card animate-pulse rounded-2xl" />)}</div>
          : products.length === 0
            ? <EmptyState icon={<ShoppingBag size={28} className="text-text-muted" />} title="No products yet" description="Add merchandise or clothing from the Upload page." />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="relative aspect-square bg-bg-secondary cursor-pointer" onClick={() => editId === p.id && imgRef.current?.click()}>
                      {(editId === p.id ? editState.imagePreview : p.images?.[0])
                        ? <img src={(editId === p.id ? editState.imagePreview : p.images?.[0]) ?? undefined} alt={p.title} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={24} className="text-text-muted" /></div>
                      }
                      {editId === p.id && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-1 text-white">
                          <Upload size={18} /><span className="text-xs">Change</span>
                          <input ref={imgRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      {editId === p.id ? (
                        <div className="space-y-2">
                          <input value={editState.title} onChange={e => setEditState(s => ({ ...s, title: e.target.value }))} className={`${inputCls} w-full`} placeholder="Title" />
                          <input type="number" value={editState.price} onChange={e => setEditState(s => ({ ...s, price: Number(e.target.value) }))} className={`${inputCls} w-full`} placeholder="Price (ZMW)" />
                          <div className="flex gap-1.5">
                            <button onClick={() => handleSave(p)} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 bg-brand text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                              <Check size={12} />{saving ? 'Saving…' : 'Save'}
                            </button>
                            <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 bg-bg-secondary border border-border text-text-secondary text-xs rounded-lg hover:text-text-primary transition-colors">
                              <X size={12} />Cancel
                            </button>
                          </div>
                        </div>
                      ) : deleteConfirm === p.id ? (
                        <div className="space-y-2">
                          <p className="text-xs text-danger">Delete "{p.title}"?</p>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 text-xs bg-danger text-white rounded-lg hover:bg-danger/80 transition-colors">Delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-xs bg-bg-secondary border border-border text-text-secondary rounded-lg hover:text-text-primary transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-text-primary truncate">{p.title}</p>
                          <p className="text-xs text-brand font-semibold mt-0.5">{formatCurrency(p.price)}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.published ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>{p.published ? 'Live' : 'Draft'}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => startEdit(p)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors" title="Edit"><Pencil size={13} /></button>
                              <button onClick={() => handleToggle(p)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors" title={p.published ? 'Unpublish' : 'Publish'}>{p.published ? <EyeOff size={13} /> : <Eye size={13} />}</button>
                              <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors" title="Delete"><Trash2 size={13} /></button>
                            </div>
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
