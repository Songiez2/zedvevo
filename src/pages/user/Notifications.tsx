import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Check, CheckCheck, TrendingUp, Download, Megaphone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/db/api'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'
import { timeAgo } from '@/lib/utils'
import type { Notification } from '@/types/types'

const TYPE_ICON: Record<string, React.ReactNode> = {
  milestone: <TrendingUp size={14} className="text-warning" />,
  download:  <Download   size={14} className="text-brand"   />,
  update:    <Megaphone  size={14} className="text-success" />,
  success:   <Check      size={14} className="text-success" />,
}

function NotifIcon({ type }: { type: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-bg-secondary flex items-center justify-center flex-shrink-0">
      {TYPE_ICON[type] ?? <Bell size={13} className="text-text-muted" />}
    </div>
  )
}

export default function NotificationsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const { data: notifications = [], refetch } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => getNotifications(profile!.id),
    enabled: !!profile,
    refetchInterval: 20_000,
  })

  const unreadCount = notifications.filter((n: Notification) => !n.read).length

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id)
    refetch()
    qc.invalidateQueries({ queryKey: ['notifications', profile?.id] })
  }

  const handleMarkAllRead = async () => {
    if (!profile) return
    await markAllNotificationsRead(profile.id)
    refetch()
    qc.invalidateQueries({ queryKey: ['notifications', profile?.id] })
  }

  return (
    <div className="animate-fade-in">
      <PageSection>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
            {unreadCount > 0 && (
              <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full font-medium">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover transition-colors"
            >
              <CheckCheck size={15} /> Mark all read
            </button>
          )}
        </div>

        <div className="max-w-2xl">
          {notifications.length === 0 ? (
            <EmptyState
              icon={<Bell size={28} className="text-text-muted" />}
              title="No notifications"
              description="You'll see stream milestones, download alerts, payment confirmations, and admin updates here."
            />
          ) : (
            <div className="space-y-2">
              {notifications.map((n: Notification) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                    n.read
                      ? 'bg-bg-secondary border-border opacity-70'
                      : 'bg-bg-card border-brand/20 hover:border-brand/40'
                  }`}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                >
                  <NotifIcon type={n.type} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${n.read ? 'text-text-muted' : 'text-text-primary'}`}>
                      {n.title}
                    </p>
                    <p className="text-sm text-text-muted mt-0.5">{n.body}</p>
                    <p className="text-xs text-text-muted mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-1.5" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PageSection>
    </div>
  )
}
