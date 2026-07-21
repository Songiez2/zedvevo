import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, Music, Video, ShoppingBag, Ticket, Download, Play } from 'lucide-react'
import { getAdminStats } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
  return (
    <div className="bg-bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
        <Icon size={18} className="text-brand" />
      </div>
      <p className="text-2xl font-bold text-text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const location = useLocation()
  const { data: stats } = useQuery({ queryKey: ['admin-stats'], queryFn: getAdminStats, staleTime: 60000 })

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-sm text-text-muted mb-8">Platform overview</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats?.totalUsers ?? '—'} icon={Users} />
          <StatCard label="Total Artists" value={stats?.totalArtists ?? '—'} icon={Music} />
          <StatCard label="Total Songs" value={stats?.totalSongs ?? '—'} icon={Music} />
          <StatCard label="Total Videos" value={stats?.totalVideos ?? '—'} icon={Video} />
          <StatCard label="Total Downloads" value={stats?.totalDownloads ?? '—'} icon={Download} />
          <StatCard label="Total Streams" value={stats?.totalStreams ?? '—'} icon={Play} />
          <StatCard label="Total Orders" value={stats?.totalOrders ?? '—'} icon={ShoppingBag} />
          <StatCard label="Tickets Sold" value={stats?.totalTickets ?? '—'} icon={Ticket} />
        </div>
      </div>
    </DashboardLayout>
  )
}
