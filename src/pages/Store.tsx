import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'
import { getProducts } from '@/db/api'
import { formatCurrency } from '@/lib/utils'
import Skeleton from '@/components/ui/Skeleton'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'
import { PRODUCT_CATEGORIES } from '@/types/types'

export default function StorePage() {
  const [category, setCategory] = useState('All')
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', category],
    queryFn: () => getProducts(40, 0, category === 'All' ? undefined : category),
  })

  return (
    <div className="animate-fade-in">
      <PageSection>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Store</h1>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {['All', ...PRODUCT_CATEGORIES].map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${category === c ? 'bg-brand text-white' : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading
          ? <Skeleton count={12} />
          : products.length === 0
            ? <EmptyState icon={<ShoppingBag size={28} className="text-text-muted" />} title="No products available yet" description="The store will be stocked by our team soon." />
            : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {products.map(p => (
                  <Link key={p.id} to={`/store/${p.id}`} className="group block bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                    <div className="aspect-square bg-bg-secondary overflow-hidden">
                      {p.images[0]
                        ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={28} className="text-text-muted" /></div>
                      }
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-text-primary truncate">{p.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{p.category}</p>
                      <p className="text-sm font-semibold text-brand mt-1">{formatCurrency(p.price)}</p>
                      {p.stock === 0 && <span className="text-xs text-danger mt-1 block">Out of stock</span>}
                    </div>
                  </Link>
                ))}
              </div>
        }
      </PageSection>
    </div>
  )
}
