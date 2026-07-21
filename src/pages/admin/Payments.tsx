import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CreditCard } from 'lucide-react'
import { getAllPayments } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatCurrency } from '@/lib/utils'

const statusColor: Record<string, string> = {
  completed: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  failed: 'bg-danger/10 text-danger',
}

export default function AdminPayments() {
  const location = useLocation()
  const { data: payments = [], isLoading } = useQuery({ queryKey: ['admin-payments'], queryFn: () => getAllPayments() })

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Payments</h1>
          <span className="text-sm text-text-muted">{payments.length} transactions</span>
        </div>
        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : payments.length === 0
            ? <EmptyState icon={<CreditCard size={28} className="text-text-muted" />} title="No payments yet" />
            : <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4 font-medium">User</th>
                      <th className="text-left py-3 pr-4 font-medium">Amount</th>
                      <th className="text-left py-3 pr-4 font-medium hidden md:table-cell">Reference</th>
                      <th className="text-left py-3 pr-4 font-medium hidden sm:table-cell">Date</th>
                      <th className="text-left py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-bg-card/50 transition-colors">
                        <td className="py-3 pr-4 text-text-primary">{p.profiles?.full_name || p.profiles?.username || '—'}</td>
                        <td className="py-3 pr-4 font-semibold text-text-primary">{formatCurrency(p.amount)}</td>
                        <td className="py-3 pr-4 text-text-muted text-xs font-mono hidden md:table-cell">{p.lipila_reference || '—'}</td>
                        <td className="py-3 pr-4 text-text-muted hidden sm:table-cell">{formatDate(p.created_at)}</td>
                        <td className="py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[p.status] || 'bg-text-muted/10 text-text-muted'}`}>{p.status}</span></td>
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
