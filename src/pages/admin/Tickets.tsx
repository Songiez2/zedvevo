import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Ticket, X, Loader2, ImagePlus } from 'lucide-react'
import { getAllEvents, createEvent, updateEvent, deleteEvent, uploadEventBanner } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'
import UploadProgress from '@/components/ui/UploadProgress'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatCurrency } from '@/lib/utils'

export default function AdminTickets() {
  const location = useLocation()
  const qc = useQueryClient()
  const bannerRef = useRef<HTMLInputElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [ticketPrice, setTicketPrice] = useState('')
  const [totalQty, setTotalQty] = useState('')
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const { data: events = [], isLoading } = useQuery({ queryKey: ['admin-events'], queryFn: () => getAllEvents() })

  const resetForm = () => {
    setTitle(''); setDescription(''); setVenue(''); setEventDate('')
    setTicketPrice(''); setTotalQty(''); setBannerFile(null); setBannerPreview(null)
    setShowForm(false); setEditId(null); setMsg(''); setUploadPct(0); setUploading(false)
  }

  const handleBannerChange = (file: File | null) => {
    setBannerFile(file)
    if (file) setBannerPreview(URL.createObjectURL(file))
    else setBannerPreview(null)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !venue.trim() || !eventDate || !ticketPrice || !totalQty) { setMsg('Please fill in all required fields'); return }
    setLoading(true); setMsg('')
    let bannerUrl: string | null = null
    if (bannerFile) {
      setUploading(true)
      bannerUrl = await uploadEventBanner(bannerFile)
      setUploadPct(100); setUploading(false)
    }
    const data = { title: title.trim(), description: description || null, venue: venue.trim(), event_date: new Date(eventDate).toISOString(), ticket_price: parseFloat(ticketPrice), total_qty: parseInt(totalQty), published: true, banner_url: bannerUrl }
    if (editId) { await updateEvent(editId, data) } else { await createEvent(data) }
    setLoading(false); qc.invalidateQueries({ queryKey: ['admin-events'] }); resetForm()
  }

  const handleEdit = (e: any) => {
    setEditId(e.id); setTitle(e.title); setDescription(e.description || ''); setVenue(e.venue)
    setEventDate(new Date(e.event_date).toISOString().slice(0, 16)); setTicketPrice(String(e.ticket_price)); setTotalQty(String(e.total_qty))
    if (e.banner_url) setBannerPreview(e.banner_url)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return
    await deleteEvent(id); qc.invalidateQueries({ queryKey: ['admin-events'] })
  }

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-text-primary">Events & Tickets</h1>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-hover text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={15} /> Create Event
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-text-primary">{editId ? 'Edit Event' : 'Create Event'}</h2>
                <button onClick={resetForm}><X size={18} className="text-text-muted" /></button>
              </div>
              <div className="space-y-4">
                {/* Banner photo picker */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Event Banner Photo</label>
                  <div
                    onClick={() => bannerRef.current?.click()}
                    className="relative w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-brand cursor-pointer overflow-hidden transition-colors flex items-center justify-center bg-bg-secondary">
                    {bannerPreview
                      ? <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />
                      : <div className="flex flex-col items-center gap-1.5 text-text-muted">
                          <ImagePlus size={24} />
                          <span className="text-xs">Tap to choose from device</span>
                        </div>
                    }
                    {bannerPreview && (
                      <button onClick={e => { e.stopPropagation(); handleBannerChange(null) }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center">
                        <X size={12} className="text-white" />
                      </button>
                    )}
                  </div>
                  <input ref={bannerRef} type="file" accept="image/*" className="hidden"
                    onChange={e => handleBannerChange(e.target.files?.[0] || null)} />
                  {uploading && <UploadProgress label="Uploading banner…" progress={uploadPct} done={uploadPct === 100} />}
                </div>

                {[
                  { label: 'Event Title *', val: title, set: setTitle, ph: 'Event name' },
                  { label: 'Venue *', val: venue, set: setVenue, ph: 'Location name' },
                  { label: 'Ticket Price (K) *', val: ticketPrice, set: setTicketPrice, ph: '0.00', type: 'number' },
                  { label: 'Total Tickets *', val: totalQty, set: setTotalQty, ph: '100', type: 'number' },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">{f.label}</label>
                    <input type={f.type || 'text'} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted" />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Event Date & Time *</label>
                  <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Event details…"
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand resize-none placeholder:text-text-muted" />
                </div>
                {msg && <p className="text-sm text-danger">{msg}</p>}
                <div className="flex gap-3">
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
                    {loading && <Loader2 size={15} className="animate-spin" />} {editId ? 'Save' : 'Create Event'}
                  </button>
                  <button onClick={resetForm} className="px-4 py-2.5 bg-bg-secondary border border-border text-text-secondary hover:text-text-primary rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading
          ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-bg-card animate-pulse rounded-2xl" />)}</div>
          : events.length === 0
            ? <EmptyState icon={<Ticket size={28} className="text-text-muted" />} title="No events yet" description="Create an event to start selling tickets." />
            : <div className="space-y-3">
                {events.map((e: any) => (
                  <div key={e.id} className="flex items-start gap-4 p-4 bg-bg-card border border-border rounded-2xl">
                    {e.banner_url
                      ? <img src={e.banner_url} alt={e.title} className="w-24 h-16 object-cover rounded-xl flex-shrink-0" />
                      : <div className="w-24 h-16 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0"><Ticket size={20} className="text-brand/40" /></div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{e.title}</p>
                      <p className="text-xs text-text-muted mt-0.5">{e.venue} · {formatDate(e.event_date)}</p>
                      <p className="text-xs text-text-muted mt-0.5">{formatCurrency(e.ticket_price)} · {e.sold_qty}/{e.total_qty} sold</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleEdit(e)} className="p-1.5 text-text-muted hover:text-brand rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
        }
      </div>
    </DashboardLayout>
  )
}
