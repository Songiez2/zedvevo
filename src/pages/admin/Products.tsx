import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, ShoppingBag, Loader2, X, ImagePlus } from 'lucide-react'
import { getAllProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import UploadProgress from '@/components/ui/UploadProgress'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { PRODUCT_CATEGORIES } from '@/types/types'

type FormMode = 'create' | 'edit' | null

export default function AdminProducts() {
  const location = useLocation()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<FormMode>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState(PRODUCT_CATEGORIES[0] || 'clothing')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadPct, setUploadPct] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const { data: products = [], isLoading } = useQuery({ queryKey: ['admin-products'], queryFn: () => getAllProducts() })

  const resetForm = () => {
    setTitle(''); setDescription(''); setPrice(''); setStock('')
    setCategory(PRODUCT_CATEGORIES[0]); setImageFiles([]); setImagePreviews([])
    setMode(null); setEditId(null); setMsg(''); setUploadPct(0); setUploading(false)
  }

  const addImages = (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).slice(0, 5 - imageFiles.length) // max 5
    setImageFiles(prev => [...prev, ...arr])
    arr.forEach(f => {
      const url = URL.createObjectURL(f)
      setImagePreviews(prev => [...prev, url])
    })
  }

  const removeImage = (idx: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx))
    setImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (!title.trim() || !price) { setMsg('Title and price are required'); return }
    setLoading(true); setMsg('')
    const imageUrls: string[] = []
    if (imageFiles.length > 0) {
      setUploading(true)
      for (let i = 0; i < imageFiles.length; i++) {
        const url = await uploadProductImage(imageFiles[i])
        if (url) imageUrls.push(url)
        setUploadPct(Math.round(((i + 1) / imageFiles.length) * 100))
      }
      setUploading(false)
    }
    if (mode === 'create') {
      await createProduct({ title: title.trim(), description: description || null, price: parseFloat(price), stock: parseInt(stock) || 0, category, images: imageUrls, published: true })
    } else if (mode === 'edit' && editId) {
      await updateProduct(editId, { title: title.trim(), description: description || null, price: parseFloat(price), stock: parseInt(stock) || 0, category, ...(imageUrls.length > 0 ? { images: imageUrls } : {}) })
    }
    setLoading(false); qc.invalidateQueries({ queryKey: ['admin-products'] }); resetForm()
  }

  const handleEdit = (p: any) => {
    setMode('edit'); setEditId(p.id); setTitle(p.title); setDescription(p.description || '')
    setPrice(String(p.price)); setStock(String(p.stock)); setCategory(p.category)
    if (p.images?.length) setImagePreviews(p.images)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return
    await deleteProduct(id); qc.invalidateQueries({ queryKey: ['admin-products'] })
  }

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Products</h1>
          <button onClick={() => setMode('create')} className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={15} /> Add Product
          </button>
        </div>

        {mode && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-text-primary">{mode === 'create' ? 'Add Product' : 'Edit Product'}</h2>
                <button onClick={resetForm} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                {/* Photo grid picker */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Photos from Device <span className="text-text-muted text-xs">(up to 5)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {imagePreviews.map((src, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(i)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center">
                          <X size={10} className="text-white" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 5 && (
                      <button onClick={() => fileRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-brand flex flex-col items-center justify-center text-text-muted hover:text-brand transition-colors">
                        <ImagePlus size={20} />
                        <span className="text-xs mt-1">Add</span>
                      </button>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => addImages(e.target.files)} />
                  {uploading && <UploadProgress label="Uploading photos…" progress={uploadPct} done={uploadPct === 100} />}
                </div>

                {[
                  { label: 'Title *', val: title, set: setTitle, ph: 'Product name', type: 'text' },
                  { label: 'Price (K) *', val: price, set: setPrice, ph: '0.00', type: 'number' },
                  { label: 'Stock Quantity', val: stock, set: setStock, ph: '0', type: 'number' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{f.label}</label>
                    <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand">
                    {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Product description…" className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand resize-none placeholder:text-text-muted" />
                </div>
                {msg && <p className="text-sm text-danger">{msg}</p>}
                <div className="flex gap-3">
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
                    {loading && <Loader2 size={15} className="animate-spin" />} {mode === 'create' ? 'Create' : 'Save'}
                  </button>
                  <button onClick={resetForm} className="px-4 py-2.5 bg-bg-secondary border border-border text-text-secondary hover:text-text-primary rounded-xl transition-colors text-sm">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading
          ? <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square bg-bg-card animate-pulse rounded-2xl" />)}</div>
          : products.length === 0
            ? <EmptyState icon={<ShoppingBag size={28} className="text-text-muted" />} title="No products yet" description="Add products to your marketplace." />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {products.map((p: any) => (
                  <div key={p.id} className="group bg-bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="relative aspect-square bg-bg-secondary">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={24} className="text-text-muted" /></div>}
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEdit(p)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"><Edit2 size={14} /></button>
                        <button onClick={() => handleDelete(p.id)} className="p-2 bg-danger/80 hover:bg-danger text-white rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-text-primary truncate">{p.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold text-brand">{formatCurrency(p.price)}</span>
                        <span className="text-xs text-text-muted">Stk: {p.stock}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
