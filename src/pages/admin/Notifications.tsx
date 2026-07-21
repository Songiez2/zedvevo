import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Trash2, Loader2, Send, Radio, Mic2 } from 'lucide-react'
import { getAllNotifications, sendBroadcastNotification, sendArtistUpdateNotification, deleteNotification, deleteAllNotifications } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  info:      'bg-brand/10 text-brand',
  success:   'bg-success/10 text-success',
  warning:   'bg-warning/10 text-warning',
  error:     'bg-danger/10 text-danger',
  update:    'bg-success/10 text-success',
  milestone: 'bg-warning/10 text-warning',
  download:  'bg-brand/10 text-brand',
}

export default function AdminNotifications() {
  const location = useLocation()
  const qc = useQueryClient()
  const { data: notifications = [], isLoading } = useQuery({ queryKey: ['admin-notifications'], queryFn: () => getAllNotifications(200) })

  // All-users broadcast form
  const [title, setTitle]   = useState('')
  const [body, setBody]     = useState('')
  const [type, setType]     = useState('info')
  const [sending, setSending] = useState(false)
  const [msg, setMsg]       = useState('')

  // Artist-only update form
  const [artTitle, setArtTitle] = useState('')
  const [artBody, setArtBody]   = useState('')
  const [artSending, setArtSending] = useState(false)
  const [artMsg, setArtMsg]     = useState('')

  const inputCls = 'w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors'

  const handleBroadcast = async () => {
    if (!title.trim() || !body.trim()) return
    setSending(true); setMsg('')
    try {
      await sendBroadcastNotification(title, body, type)
      setTitle(''); setBody(''); setType('info')
      setMsg('Broadcast sent to all users!')
      qc.invalidateQueries({ queryKey: ['admin-notifications'] })
    } catch { setMsg('Failed to send') }
    setSending(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const handleArtistUpdate = async () => {
    if (!artTitle.trim() || !artBody.trim()) return
    setArtSending(true); setArtMsg('')
    try {
      await sendArtistUpdateNotification(artTitle, artBody)
      setArtTitle(''); setArtBody('')
      setArtMsg('Update sent to all artists!')
      qc.invalidateQueries({ queryKey: ['admin-notifications'] })
    } catch { setArtMsg('Failed to send') }
    setArtSending(false)
    setTimeout(() => setArtMsg(''), 4000)
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
    qc.invalidateQueries({ queryKey: ['admin-notifications'] })
  }

  const handleClearAll = async () => {
    if (!confirm('Delete all notifications? This cannot be undone.')) return
    await deleteAllNotifications()
    qc.invalidateQueries({ queryKey: ['admin-notifications'] })
  }

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-1">Notifications</h1>
        <p className="text-sm text-text-muted mb-8">Broadcast messages to all users or send updates to artists only</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* All-users broadcast */}
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Radio size={16} className="text-brand" />
              <h2 className="text-sm font-semibold text-text-secondary">Broadcast to All Users</h2>
            </div>
            <div className="space-y-3">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" className={inputCls} />
              <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Message body" rows={3} className={`${inputCls} resize-none`} />
              <select value={type} onChange={e => setType(e.target.value)} className={inputCls}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            {msg && <p className="text-xs text-brand mt-2">{msg}</p>}
            <button onClick={handleBroadcast} disabled={sending || !title.trim() || !body.trim()}
              className="mt-4 flex items-center gap-2 px-5 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send to All Users
            </button>
          </div>

          {/* Artist-only update */}
          <div className="bg-bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mic2 size={16} className="text-success" />
              <h2 className="text-sm font-semibold text-text-secondary">Artist Update</h2>
              <span className="ml-auto text-[10px] bg-success/10 text-success px-2 py-0.5 rounded-full font-semibold">Artists only</span>
            </div>
            <div className="space-y-3">
              <input value={artTitle} onChange={e => setArtTitle(e.target.value)} placeholder="Update title" className={inputCls} />
              <textarea value={artBody} onChange={e => setArtBody(e.target.value)} placeholder="Update details for artists…" rows={3} className={`${inputCls} resize-none`} />
            </div>
            {artMsg && <p className="text-xs text-success mt-2">{artMsg}</p>}
            <button onClick={handleArtistUpdate} disabled={artSending || !artTitle.trim() || !artBody.trim()}
              className="mt-4 flex items-center gap-2 px-5 py-2 bg-success hover:bg-success/80 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {artSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Send to Artists
            </button>
          </div>
        </div>

        {/* History */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            History <span className="text-text-muted font-normal">({notifications.length})</span>
          </h2>
          {notifications.length > 0 && (
            <button onClick={handleClearAll}
              className="text-xs text-danger hover:text-danger/80 flex items-center gap-1 transition-colors">
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>

        {isLoading
          ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : notifications.length === 0
            ? <EmptyState icon={<Bell size={28} className="text-text-muted" />} title="No notifications yet" />
            : <div className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className="flex items-start gap-3 p-4 bg-bg-card border border-border rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-text-primary truncate">{n.title}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_COLORS[n.type] ?? TYPE_COLORS.info}`}>{n.type}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-text-muted line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-text-muted mt-1">
                        {n.profiles?.username || n.profiles?.full_name || 'User'} · {formatDate(n.created_at)}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(n.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-danger/10 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
