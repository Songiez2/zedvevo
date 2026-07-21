import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Eye, EyeOff, Ticket, Pencil, Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistEvents, updateEvent, deleteEvent } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'
import EmptyState from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Event } from '@/types/types'

interface EditState { title: string; venue: string; ticket_price: number }

export default function ArtistEvents() {
  const location = useLocation()
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [editId, setEditId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ title: '', venue: '', ticket_price: 0 })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['artist-events', profile?.id],
    queryFn: () => getArtistEvents(profile!.id),
    enabled: !!profile,
  })

  const startEdit = (ev: Event) => {
    setEditId(ev.id)
    setEditState({ title: ev.title, venue: ev.venue || '', ticket_price: ev.ticket_price || 0 })
  }
  const cancelEdit = () => { setEditId(null); setEditState({ title: '', venue: '', ticket_price: 0 }) }

  const handleSave = async (ev: Event) => {
    if (!profile) return
    setSaving(true)
    try {
      await updateEvent(ev.id, {
        title: editState.title.trim() || ev.title,
        venue: editState.venue.trim() || ev.venue,
        ticket_price: editState.ticket_price || ev.ticket_price,
      })
      qc.invalidateQueries({ queryKey: ['artist-events'] })
      cancelEdit()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    await deleteEvent(id)
    qc.invalidateQueries({ queryKey: ['artist-events'] })
    setDeleteConfirm(null)
  }

  const handleToggle = async (ev: Event) => {
    await updateEvent(ev.id, { published: !ev.published })
    qc.invalidateQueries({ queryKey: ['artist-events'] })
  }

  const inputCls = 'w-full bg-bg-secondary border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary outline-none focus:border-brand transition-colors'

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">My Events & Tickets</h1>
        </div>

        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-bg-card animate-pulse rounded-2xl" />)}</div>
          : events.length === 0
            ? <EmptyState icon={<Ticket size={28} className="text-text-muted" />} title="No events yet" description="Create events from the Upload page to sell tickets." />
            : <div className="space-y-3">
                {events.map(ev => (
                  <div key={ev.id} className="bg-bg-card border border-border rounded-2xl p-4">
                    {editId === ev.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Title</label>
                            <input value={editState.title} onChange={e => setEditState(s => ({ ...s, title: e.target.value }))} className={inputCls} placeholder="Event title" />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Venue</label>
                            <input value={editState.venue} onChange={e => setEditState(s => ({ ...s, venue: e.target.value }))} className={inputCls} placeholder="Venue" />
                          </div>
                          <div>
                            <label className="block text-xs text-text-muted mb-1">Ticket Price (ZMW)</label>
                            <input type="number" value={editState.ticket_price} onChange={e => setEditState(s => ({ ...s, ticket_price: Number(e.target.value) }))} className={inputCls} placeholder="0" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSave(ev)} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50">
                            <Check size={14} />{saving ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={cancelEdit}
                            className="flex items-center gap-1.5 px-4 py-2 bg-bg-secondary border border-border text-text-secondary text-sm rounded-xl hover:text-text-primary transition-colors">
                            <X size={14} />Cancel
                          </button>
                        </div>
                      </div>
                    ) : deleteConfirm === ev.id ? (
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-danger flex-1">Delete "{ev.title}"? This cannot be undone.</p>
                        <button onClick={() => handleDelete(ev.id)} className="px-3 py-1.5 text-xs bg-danger text-white rounded-xl hover:bg-danger/80 transition-colors">Delete</button>
                        <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-xs bg-bg-secondary border border-border text-text-secondary rounded-xl hover:text-text-primary transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-text-primary">{ev.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${ev.published ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>{ev.published ? 'Live' : 'Draft'}</span>
                          </div>
                          <p className="text-sm text-text-muted mt-0.5">{ev.venue} · {formatDate(ev.event_date)}</p>
                          {ev.ticket_price ? <p className="text-sm text-brand font-semibold mt-0.5">{formatCurrency(ev.ticket_price)} / ticket · {ev.sold_qty ?? 0}/{ev.capacity ?? '∞'} sold</p> : null}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => startEdit(ev)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors" title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => handleToggle(ev)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors" title={ev.published ? 'Unpublish' : 'Publish'}>{ev.published ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                          <button onClick={() => setDeleteConfirm(ev.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors" title="Delete"><Trash2 size={14} /></button>
                        </div>
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
