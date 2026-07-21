import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingBag } from 'lucide-react'
import { getAllOrders } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

export default function AdminOrders() {
  const location = useLocation()
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['admin-orders'], queryFn: () => getAllOrders() })

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Orders</h1>
          <span className="text-sm text-text-muted">{orders.length} total</span>
        </div>
        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : orders.length === 0
            ? <EmptyState icon={<ShoppingBag size={28} className="text-text-muted" />} title="No orders yet" />
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4 font-medium">User</th>
                      <th className="text-left py-3 pr-4 font-medium">Type</th>
                      <th className="text-left py-3 pr-4 font-medium hidden sm:table-cell">Date</th>
                      <th className="text-left py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-bg-card/50 transition-colors">
                        <td className="py-3 pr-4 text-text-primary">{o.profiles?.full_name || o.profiles?.username || '—'}</td>
                        <td className="py-3 pr-4 text-text-muted capitalize">{o.content_type?.replace('_', ' ')}</td>
                        <td className="py-3 pr-4 text-text-muted hidden sm:table-cell">{formatDate(o.created_at)}</td>
                        <td className="py-3"><span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">Confirmed</span></td>
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
