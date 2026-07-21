import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Lock, ArrowLeft, Download, Headphones, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { hasPurchased } from '@/db/api'
import { formatCurrency, formatDuration } from '@/lib/utils'
import { usePageMeta } from '@/hooks/usePageMeta'
import PaymentModal from '@/components/ui/PaymentModal'
import ShareMenu from '@/components/ui/ShareMenu'
import EmptyState from '@/components/ui/EmptyState'
import type { Video } from '@/types/types'

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchased, setPurchased] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [plays, setPlays] = useState(0)
  const [downloads, setDownloads] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('videos').select('*, artist:profiles(id,username,full_name,avatar_url)').eq('id', id).maybeSingle().then(({ data }) => {
      setVideo(data)
      setPlays(data?.plays ?? 0)
      setDownloads(data?.downloads ?? 0)
      setLoading(false)
    })
    if (profile) hasPurchased(profile.id, 'video', id).then(setPurchased)
  }, [id, profile])

  // Real-time plays + downloads
  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`video-stats-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos', filter: `id=eq.${id}` },
        (payload) => {
          const n = payload.new as { plays?: number; downloads?: number }
          if (n.plays !== undefined) setPlays(n.plays)
          if (n.downloads !== undefined) setDownloads(n.downloads)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handlePlay = () => {
    // Increment plays counter
    void (async () => {
      try {
        const { data } = await supabase.from('videos').select('plays').eq('id', id!).maybeSingle()
        if (data) await supabase.from('videos').update({ plays: (data.plays ?? 0) + 1 }).eq('id', id!)
      } catch { /* ignore */ }
    })()
  }

  const handlePaySuccess = () => {
    setPayOpen(false)
    let attempts = 0
    const poll = setInterval(async () => {
      attempts++
      const { data } = await supabase.from('purchases').select('id').eq('user_id', profile!.id).eq('content_type', 'video').eq('content_id', id!).maybeSingle()
      if (data) { setPurchased(true); clearInterval(poll) }
      if (attempts > 12) clearInterval(poll)
    }, 5000)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!video) return <EmptyState title="Video not found" />

  const canWatch = !video.is_premium || purchased || !profile
  const isPremiumLocked = video.is_premium && !purchased
  const shareUrl = `${window.location.origin}/videos/${video.id}`
  const artistName = (video.artist as { full_name?: string; username?: string } | undefined)?.full_name
    || (video.artist as { full_name?: string; username?: string } | undefined)?.username
    || 'Artist'

  // eslint-disable-next-line react-hooks/rules-of-hooks
  usePageMeta({
    title: `${video.title} — ${artistName}`,
    description: `Watch "${video.title}" by ${artistName} on ZedVevo — Zambia's entertainment platform.`,
    image: video.thumbnail_url ?? undefined,
    url: shareUrl,
    type: 'video.other',
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <Link to="/videos" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary mb-8 transition-colors">
        <ArrowLeft size={16} /> Back to Videos
      </Link>

      {/* Video player */}
      <div className="relative aspect-video bg-black rounded-2xl overflow-hidden mb-6">
        {canWatch ? (
          <video ref={videoRef} src={video.video_url} controls className="w-full h-full"
            poster={video.thumbnail_url || undefined}
            onPlay={handlePlay} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 relative">
            {video.thumbnail_url && <img src={video.thumbnail_url} alt={video.title} className="absolute inset-0 w-full h-full object-cover opacity-20" />}
            <div className="relative z-10 flex flex-col items-center gap-4">
              <Lock size={40} className="text-warning" />
              <p className="text-sm text-text-secondary">This is premium content</p>
              {profile ? (
                <button onClick={() => setPayOpen(true)} className="flex items-center gap-2 px-6 py-2.5 bg-warning hover:bg-warning/80 text-black font-semibold rounded-xl transition-colors">
                  Purchase {formatCurrency(video.price || 0)} to Watch
                </button>
              ) : (
                <Link to="/login" className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors">
                  Sign in to purchase
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{video.title}</h1>
          <ShareMenu title={video.title} artist={artistName} url={shareUrl} imageUrl={video.thumbnail_url ?? undefined} />
        </div>

        {/* Live stats */}
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <Eye size={13} /> <span className="tabular-nums">{plays.toLocaleString()}</span> views
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <Headphones size={13} /> <span className="tabular-nums">{downloads.toLocaleString()}</span> downloads
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand/20 flex items-center justify-center text-brand text-sm font-bold">
            {((video as any).artist?.full_name || 'A')[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{(video as any).artist?.full_name || (video as any).artist?.username || 'Artist'}</p>
            {video.genre && <p className="text-xs text-text-muted">{video.genre}</p>}
          </div>
        </div>
        {video.description && <p className="text-sm text-text-secondary leading-relaxed border-t border-border pt-3">{video.description}</p>}
        <div className="flex items-center gap-4 text-xs text-text-muted border-t border-border pt-3">
          {video.duration && <span>Duration: {formatDuration(video.duration)}</span>}
          {video.is_premium && !isPremiumLocked && (
            <a href={video.video_url} download className="flex items-center gap-1 text-brand hover:text-brand-hover transition-colors">
              <Download size={13} /> Download
            </a>
          )}
        </div>
      </div>

      {payOpen && video.is_premium && profile && (
        <PaymentModal
          isOpen={payOpen} onClose={() => setPayOpen(false)} onSuccess={handlePaySuccess}
          amount={video.price!} contentType="video" contentId={video.id}
          description={`Purchase video "${video.title}"`}
        />
      )}
    </div>
  )
}
