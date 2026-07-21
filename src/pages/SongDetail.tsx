import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, Pause, Lock, ArrowLeft, MessageCircle, Loader2, Download, Headphones } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { usePlayerStore } from '@/stores/playerStore'
import { useAuth } from '@/contexts/AuthContext'
import { hasPurchased, getComments, addComment } from '@/db/api'
import { formatDuration, formatCurrency, timeAgo } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'
import PaymentModal from '@/components/ui/PaymentModal'
import ShareMenu from '@/components/ui/ShareMenu'
import EmptyState from '@/components/ui/EmptyState'
import type { ExternalMusic, Comment } from '@/types/types'

function LiveCounter({ value, icon: Icon, label }: { value: number; icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-text-muted">
      <Icon size={13} />
      <span className="text-xs tabular-nums">{value.toLocaleString()}</span>
      <span className="text-xs">{label}</span>
    </div>
  )
}

export default function SongDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { currentTrack, isPlaying, setTrack, togglePlay } = usePlayerStore()
  const [track, setTrackData] = useState<ExternalMusic | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchased, setPurchased] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [plays, setPlays] = useState(0)
  const [downloads, setDownloads] = useState(0)

  useEffect(() => {
    if (!id) return
    supabase.from('external_music').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      setTrackData(data)
      setLoading(false)
    })
    // Also try songs table for local uploads
    supabase.from('songs').select('plays,downloads').eq('id', id).maybeSingle().then(({ data }) => {
      if (data) { setPlays(data.plays ?? 0); setDownloads(data.downloads ?? 0) }
    })
    getComments('song', id).then(setComments)
    if (profile) hasPurchased(profile.id, 'song', id).then(setPurchased)
  }, [id, profile])

  // Real-time streams + downloads via Supabase Realtime
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`song-stats-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'songs', filter: `id=eq.${id}` },
        (payload) => {
          const n = payload.new as { plays?: number; downloads?: number }
          if (n.plays !== undefined) setPlays(n.plays)
          if (n.downloads !== undefined) setDownloads(n.downloads)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const isCurrent = currentTrack?.id === track?.id

  const handlePlay = () => {
    if (!track) return
    if (isCurrent) togglePlay()
    else setTrack(track)
    // Increment plays
    void (async () => {
      try {
        const { data } = await supabase.from('songs').select('plays').eq('id', id!).maybeSingle()
        if (data) await supabase.from('songs').update({ plays: (data.plays ?? 0) + 1 }).eq('id', id!)
      } catch { /* ignore */ }
    })()
  }

  const handleDownload = async () => {
    if (!track?.audio_url) return
    try {
      const a = document.createElement('a')
      a.href = track.audio_url
      a.download = `${track.title} - ${track.artist}.mp3`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Increment downloads counter for uploaded songs
      const { data } = await supabase.from('songs').select('downloads').eq('id', id!).maybeSingle()
      if (data) {
        await supabase.from('songs').update({ downloads: (data.downloads ?? 0) + 1 }).eq('id', id!)
        setDownloads(v => v + 1)
      }
    } catch { /* ignore */ }
  }

  const handlePaySuccess = (_paymentId: string) => {
    setPayOpen(false)
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const { data } = await supabase.from('purchases').select('id').eq('user_id', profile!.id).eq('content_type', 'song').eq('content_id', id!).maybeSingle()
      if (data) { setPurchased(true); clearInterval(poll) }
      if (attempts > 12) clearInterval(poll)
    }, 5000)
  }

  const handleComment = async () => {
    if (!profile || !commentText.trim() || !id) return
    setCommentLoading(true)
    const newComment = await addComment(profile.id, 'song', id, commentText.trim())
    if (newComment) { setComments(prev => [...prev, newComment]); setCommentText('') }
    setCommentLoading(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!track) return <EmptyState title="Track not found" />

  const canPlay = !track.is_premium || purchased || !profile
  const shareUrl = `${window.location.origin}/music/${track.id}`

  // eslint-disable-next-line react-hooks/rules-of-hooks
  usePageMeta({
    title: `${track.title} by ${track.artist}`,
    description: `Listen to "${track.title}" by ${track.artist}${track.album ? ` from the album ${track.album}` : ''} on ZedVevo.`,
    image: track.cover ?? undefined,
    url: shareUrl,
    type: 'music.song',
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fade-in">
      <Link to="/music" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Music
      </Link>

      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {track.cover
          ? <img src={track.cover} alt={track.title} className="w-48 h-48 rounded-2xl object-cover flex-shrink-0 mx-auto sm:mx-0" />
          : <div className="w-48 h-48 rounded-2xl bg-brand/20 flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0"><Play size={40} className="text-brand" /></div>
        }
        <div className="flex-1 flex flex-col justify-center">
          <span className="text-xs text-text-muted uppercase tracking-wider mb-2">Song</span>
          <h1 className="text-2xl font-bold text-text-primary">{track.title}</h1>
          <p className="text-text-secondary mt-1">{track.artist}</p>
          {track.album && <p className="text-sm text-text-muted mt-0.5">{track.album}</p>}
          {track.genre && <span className="inline-block mt-2 text-xs text-text-muted bg-bg-card border border-border px-2.5 py-1 rounded-full">{track.genre}</span>}

          {/* Live stats */}
          <div className="flex items-center gap-4 mt-3">
            <LiveCounter value={plays} icon={Headphones} label="streams" />
            <LiveCounter value={downloads} icon={Download} label="downloads" />
          </div>

          <div className="flex items-center gap-3 mt-5">
            {canPlay ? (
              <button onClick={handlePlay}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors">
                {isCurrent && isPlaying ? <><Pause size={18} /> Pause</> : <><Play size={18} /> Play</>}
              </button>
            ) : (
              <>
                <button onClick={() => setPayOpen(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-warning hover:bg-warning/80 text-black font-semibold rounded-xl transition-colors">
                  <Lock size={16} /> Purchase {formatCurrency(track.price || 0)}
                </button>
                <span className="text-xs text-text-muted">Purchase to unlock full track</span>
              </>
            )}
            {!profile && track.is_premium && (
              <Link to="/login" className="text-sm text-brand hover:text-brand-hover flex items-center gap-1 transition-colors">
                <Lock size={14} /> Sign in to purchase
              </Link>
            )}
            <ShareMenu
              title={track.title}
              artist={track.artist}
              url={shareUrl}
              imageUrl={track.cover ?? undefined}
            />
            {/* Download button — only for free or purchased tracks */}
            {(canPlay && track.audio_url) && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-bg-card border border-border hover:border-brand/50 text-text-secondary hover:text-brand font-medium rounded-xl transition-colors"
              >
                <Download size={16} /> Download
              </button>
            )}
          </div>

          {track.duration && <p className="text-xs text-text-muted mt-3">Duration: {formatDuration(track.duration)}</p>}
        </div>
      </div>

      {/* Comments */}
      <div className="border-t border-border pt-8">
        <div className="flex items-center gap-2 mb-5">
          <MessageCircle size={18} className="text-text-muted" />
          <h2 className="text-base font-semibold text-text-primary">Comments ({comments.length})</h2>
        </div>

        {profile ? (
          <div className="flex gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold flex-shrink-0">
              {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment…" onKeyDown={e => e.key === 'Enter' && handleComment()}
                className="flex-1 bg-bg-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors" />
              <button onClick={handleComment} disabled={!commentText.trim() || commentLoading}
                className="px-4 py-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5">
                {commentLoading ? <Loader2 size={14} className="animate-spin" /> : null} Post
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted mb-6"><Link to="/login" className="text-brand hover:text-brand-hover">Sign in</Link> to comment</p>
        )}

        {comments.length === 0
          ? <p className="text-sm text-text-muted text-center py-8">Be the first to comment</p>
          : <div className="space-y-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold flex-shrink-0">
                    {((c.profile as any)?.full_name || (c.profile as any)?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-text-primary">{(c.profile as any)?.full_name || (c.profile as any)?.username || 'User'}</span>
                      <span className="text-xs text-text-muted">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-text-secondary">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {payOpen && track.is_premium && profile && (
        <PaymentModal
          isOpen={payOpen} onClose={() => setPayOpen(false)} onSuccess={handlePaySuccess}
          amount={track.price!} contentType="song" contentId={track.id}
          description={`Purchase "${track.title}" by ${track.artist}`}
        />
      )}
    </div>
  )
}
