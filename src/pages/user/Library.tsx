import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, ListMusic, Ticket, ShoppingBag, Download, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getUserPurchases, getUserTickets, getLikedSongs, getUserPlaylists, createPlaylist, deletePlaylist } from '@/db/api'
import TrackRow from '@/components/music/TrackRow'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'
import { formatDate } from '@/lib/utils'

const TABS = ['Purchases', 'Downloads', 'Liked Songs', 'Playlists', 'Tickets'] as const
type Tab = typeof TABS[number]

export default function LibraryPage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('Liked Songs')
  const [newPlaylist, setNewPlaylist] = useState('')
  const [creating, setCreating] = useState(false)

  const { data: purchases = [] } = useQuery({ queryKey: ['purchases', profile?.id], queryFn: () => getUserPurchases(profile!.id), enabled: !!profile })
  const { data: tickets = [] } = useQuery({ queryKey: ['tickets', profile?.id], queryFn: () => getUserTickets(profile!.id), enabled: !!profile })
  const { data: likedSongs = [] } = useQuery({ queryKey: ['liked', profile?.id], queryFn: () => getLikedSongs(profile!.id), enabled: !!profile })
  const { data: playlists = [], refetch: refetchPlaylists } = useQuery({ queryKey: ['playlists', profile?.id], queryFn: () => getUserPlaylists(profile!.id), enabled: !!profile })

  const handleCreatePlaylist = async () => {
    if (!profile || !newPlaylist.trim()) return
    setCreating(true)
    await createPlaylist(profile.id, newPlaylist.trim())
    setNewPlaylist(''); refetchPlaylists(); setCreating(false)
  }

  const handleDeletePlaylist = async (id: string) => {
    await deletePlaylist(id); refetchPlaylists()
  }

  if (!profile) return null

  return (
    <div className="animate-fade-in">
      <PageSection>
        <h1 className="text-2xl font-bold text-text-primary mb-6">My Library</h1>

        {/* Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-8 border-b border-border">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors -mb-px ${tab === t ? 'text-brand border-b-2 border-brand' : 'text-text-secondary hover:text-text-primary'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Liked Songs */}
        {tab === 'Liked Songs' && (
          likedSongs.length === 0
            ? <EmptyState icon={<Heart size={28} className="text-text-muted" />} title="No liked songs yet" description="Like songs as you listen to save them here." />
            : <div className="space-y-1">{likedSongs.map((t, i) => <TrackRow key={t.id} track={t} queue={likedSongs} index={i} showIndex />)}</div>
        )}

        {/* Purchases */}
        {tab === 'Purchases' && (
          purchases.length === 0
            ? <EmptyState icon={<ShoppingBag size={28} className="text-text-muted" />} title="No purchases yet" description="Purchase songs, videos, and products to see them here." />
            : <div className="space-y-3">
                {purchases.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-bg-card border border-border rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary capitalize">{p.content_type}</p>
                      <p className="text-xs text-text-muted">{formatDate(p.created_at)}</p>
                    </div>
                    <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">Purchased</span>
                  </div>
                ))}
              </div>
        )}

        {/* Downloads */}
        {tab === 'Downloads' && (
          <EmptyState icon={<Download size={28} className="text-text-muted" />} title="No downloads yet" description="Download purchased tracks for offline listening." />
        )}

        {/* Playlists */}
        {tab === 'Playlists' && (
          <div className="space-y-5">
            <div className="flex gap-3">
              <input value={newPlaylist} onChange={e => setNewPlaylist(e.target.value)}
                placeholder="New playlist name…" onKeyDown={e => e.key === 'Enter' && handleCreatePlaylist()}
                className="flex-1 bg-bg-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors" />
              <button onClick={handleCreatePlaylist} disabled={!newPlaylist.trim() || creating}
                className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5">
                <Plus size={15} /> Create
              </button>
            </div>
            {playlists.length === 0
              ? <EmptyState icon={<ListMusic size={28} className="text-text-muted" />} title="No playlists yet" description="Create a playlist to organise your favourite tracks." />
              : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {playlists.map(pl => (
                    <div key={pl.id} className="group bg-bg-card border border-border rounded-2xl p-4 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{pl.title}</p>
                        {pl.description && <p className="text-xs text-text-muted mt-0.5">{pl.description}</p>}
                        <p className="text-xs text-text-muted mt-1">{formatDate(pl.created_at)}</p>
                      </div>
                      <button onClick={() => handleDeletePlaylist(pl.id)} className="p-1.5 text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* Tickets */}
        {tab === 'Tickets' && (
          tickets.length === 0
            ? <EmptyState icon={<Ticket size={28} className="text-text-muted" />} title="No tickets yet" description="Purchase event tickets to see them here." />
            : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.map(t => (
                  <div key={t.id} className="bg-bg-card border border-border rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{(t.event as any)?.title || 'Event'}</p>
                        <p className="text-xs text-text-muted mt-0.5">{(t.event as any)?.venue}</p>
                        {(t.event as any)?.event_date && <p className="text-xs text-text-muted">{formatDate((t.event as any).event_date)}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.status === 'active' ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted font-mono">Ticket #{t.ticket_number}</p>
                    {t.qr_code && <img src={t.qr_code} alt="QR" className="w-28 h-28 mt-3 rounded-xl" />}
                  </div>
                ))}
              </div>
        )}
      </PageSection>
    </div>
  )
}
