import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingBag, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { hasPurchased } from '@/db/api'
import { formatCurrency } from '@/lib/utils'
import PaymentModal from '@/components/ui/PaymentModal'
import EmptyState from '@/components/ui/EmptyState'
import type { Product } from '@/types/types'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchased, setPurchased] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  useEffect(() => {
    if (!id) return
    supabase.from('products').select('*').eq('id', id).maybeSingle().then(({ data }) => { setProduct(data); setLoading(false) })
    if (profile) hasPurchased(profile.id, 'product', id).then(setPurchased)
  }, [id, profile])

  const handlePaySuccess = () => {
    setPayOpen(false)
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const { data } = await supabase.from('purchases').select('id').eq('user_id', profile!.id).eq('content_type', 'product').eq('content_id', id!).maybeSingle()
      if (data) { setPurchased(true); clearInterval(poll) }
      if (attempts > 12) clearInterval(poll)
    }, 5000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!product) return <EmptyState title="Product not found" />

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <Link to="/store" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Store
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-square bg-bg-card rounded-2xl overflow-hidden border border-border">
            {product.images[imgIdx]
              ? <img src={product.images[imgIdx]} alt={product.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={40} className="text-text-muted" /></div>
            }
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === imgIdx ? 'border-brand' : 'border-border hover:border-brand/50'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">{product.category}</span>
            <h1 className="text-2xl font-bold text-text-primary mt-1">{product.title}</h1>
            <p className="text-3xl font-bold text-brand mt-3">{formatCurrency(product.price)}</p>
          </div>

          {product.description && <p className="text-sm text-text-secondary leading-relaxed">{product.description}</p>}

          <div className="space-y-2 text-sm text-text-muted">
            <p>Stock: <span className={product.stock > 0 ? 'text-success' : 'text-danger'}>{product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</span></p>
            {purchased && <p className="text-success font-medium">✓ You own this product</p>}
          </div>

          {purchased ? (
            <div className="px-5 py-3 bg-success/10 border border-success/20 rounded-xl text-sm text-success font-medium">
              Purchase confirmed — check your email for order details
            </div>
          ) : product.stock > 0 ? (
            profile ? (
              <button onClick={() => setPayOpen(true)}
                className="w-full py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <ShoppingBag size={18} /> Buy Now — {formatCurrency(product.price)}
              </button>
            ) : (
              <Link to="/login" className="block w-full text-center py-3 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors">
                Sign in to Purchase
              </Link>
            )
          ) : (
            <div className="w-full py-3 bg-bg-card border border-border text-text-muted text-center rounded-xl cursor-not-allowed">
              Out of Stock
            </div>
          )}
        </div>
      </div>

      {payOpen && profile && (
        <PaymentModal isOpen={payOpen} onClose={() => setPayOpen(false)} onSuccess={handlePaySuccess}
          amount={product.price} contentType="product" contentId={product.id}
          description={`Purchase "${product.title}"`} />
      )}
    </div>
  )
}
