import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, RefreshCw, ChevronDown } from 'lucide-react'
import { getAuditLogs } from '@/db/api'
import type { AuditLog } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'

const RESOURCES = ['all', 'user', 'song', 'video', 'product', 'event', 'payment', 'artist', 'category', 'ad', 'sponsor']
const ACTION_COLORS: Record<string, string> = {
  create:  'text-success bg-success/10',
  update:  'text-brand bg-brand/10',
  delete:  'text-danger bg-danger/10',
  login:   'text-text-secondary bg-bg-secondary',
  logout:  'text-text-secondary bg-bg-secondary',
  ban:     'text-danger bg-danger/10',
  unban:   'text-success bg-success/10',
  approve: 'text-success bg-success/10',
  suspend: 'text-warning bg-warning/10',
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action.toLowerCase()] ?? 'text-text-muted bg-bg-secondary'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {action}
    </span>
  )
}

export default function AdminAuditLogs() {
  const location = useLocation()
  const [resource, setResource] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', resource],
    queryFn: () => getAuditLogs(200, 0, resource === 'all' ? undefined : resource),
    staleTime: 30000,
  })

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <ScrollText size={20} className="text-brand" />
            <h1 className="text-xl font-bold text-text-primary">Audit Logs</h1>
          </div>
          <button onClick={() => refetch()} disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary hover:text-text-primary text-xs rounded-lg transition-colors">
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        <p className="text-sm text-text-muted mb-6">Complete audit trail of all administrative actions</p>

        {/* Resource filter */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {RESOURCES.map(r => (
            <button key={r} onClick={() => setResource(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${resource === r ? 'bg-brand text-white' : 'border border-border text-text-secondary hover:text-text-primary hover:bg-bg-card'}`}>
              {r}
            </button>
          ))}
        </div>

        {isLoading
          ? <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 bg-bg-card animate-pulse rounded-xl" />)}</div>
          : logs.length === 0
            ? <EmptyState icon={<ScrollText size={28} className="text-text-muted" />} title="No audit logs yet" description="Actions performed by admins and the system will appear here" />
            : <div className="space-y-1.5">
                {(logs as AuditLog[]).map(log => (
                  <div key={log.id} className="bg-bg-card border border-border rounded-xl overflow-hidden">
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-secondary/50 transition-colors"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <ActionBadge action={log.action} />
                      <span className="text-xs text-text-muted capitalize font-medium w-20 flex-shrink-0">{log.resource}</span>
                      <span className="text-sm text-text-primary flex-1 truncate">
                        {log.actor_email ?? 'System'} {log.resource_id ? `→ ${log.resource_id.slice(0, 8)}…` : ''}
                      </span>
                      <span className="text-[11px] text-text-muted flex-shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                      <ChevronDown size={14} className={`text-text-muted flex-shrink-0 transition-transform ${expanded === log.id ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded === log.id && (
                      <div className="px-4 pb-3 border-t border-border bg-bg-secondary/30">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mt-3 text-xs">
                          <div><span className="text-text-muted">Actor ID:</span> <span className="text-text-secondary font-mono">{log.actor_id ?? '—'}</span></div>
                          <div><span className="text-text-muted">Email:</span> <span className="text-text-secondary">{log.actor_email ?? '—'}</span></div>
                          <div><span className="text-text-muted">Resource:</span> <span className="text-text-secondary capitalize">{log.resource}</span></div>
                          <div><span className="text-text-muted">Resource ID:</span> <span className="text-text-secondary font-mono">{log.resource_id ?? '—'}</span></div>
                          {log.ip_address && <div><span className="text-text-muted">IP:</span> <span className="text-text-secondary">{log.ip_address}</span></div>}
                          <div><span className="text-text-muted">Timestamp:</span> <span className="text-text-secondary">{new Date(log.created_at).toISOString()}</span></div>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <div className="mt-3">
                            <p className="text-[11px] text-text-muted mb-1">Details</p>
                            <pre className="text-[11px] text-text-secondary bg-bg-secondary rounded-lg p-2 overflow-x-auto font-mono">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
