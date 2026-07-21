import { Play, Pause, Download, ShoppingCart, Headphones, SkipBack, SkipForward } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePlayerStore } from '@/stores/playerStore'
import ShareMenu from '@/components/ui/ShareMenu'
import PaymentModal from '@/components/ui/PaymentModal'
import type { ExternalMusic } from '@/types/types'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  track: ExternalMusic
  queue?: ExternalMusic[]
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function TrackCard({ track, queue = [] }: Props) {
  const { currentTrack, isPlaying, setTrack, togglePlay, next, previous } = usePlayerStore()
  const { profile } = useAuth()
  const isCurrent = currentTrack?.id === track.id
  const [payOpen, setPayOpen] = useState(false)
  const [purchased, setPurchased] = useState(false)
  const [localDownloads, setLocalDownloads] = useState(track.downloads ?? 0)

  const canAccess = !track.is_premium || purchased

  // Clicking anywhere on the card plays the song
  const handleCardClick = () => {
    if (!canAccess) return
    if (isCurrent) togglePlay()
    else setTrack(track, queue.length > 0 ? queue : [track])
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!track.audio_url) return
    try {
      const a = document.createElement('a')
      a.href = track.audio_url
      a.download = `${track.title} - ${track.artist}.mp3`
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      if (track.source === 'upload') {
        const { data } = await supabase.from('songs').select('downloads').eq('id', track.id).maybeSingle()
        if (data) {
          await supabase.from('songs').update({ downloads: (data.downloads ?? 0) + 1 }).eq('id', track.id)
          setLocalDownloads(v => v + 1)
        }
      }
    } catch { /* ignore */ }
  }

  const handlePaySuccess = (_id: string) => { setPayOpen(false); setPurchased(true) }

  const detailHref = `/music/${track.id}`
  const shareUrl = `${window.location.origin}${detailHref}`
  const plays = track.plays ?? 0

  return (
    <>
      {/* Whole card is clickable — plays the song */}
      <div
        onClick={handleCardClick}
        className={`group relative bg-bg-card border rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 select-none
          ${isCurrent ? 'border-brand/60 ring-1 ring-brand/20' : 'border-border hover:border-brand/30'}`}
      >
        {/* ── Cover art ── */}
        <div className="relative aspect-square">
          {track.cover
            ? <img src={track.cover} alt={track.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center">
                <Play size={32} className="text-brand/50" />
              </div>
          }

          {/* Gradient scrim — always present when playing so controls are readable */}
          <div className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

          {/* ── Playback controls overlay ── */}
          <div className={`absolute inset-0 flex items-center justify-center gap-3 transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {/* Previous */}
            <button
              onClick={e => { e.stopPropagation(); previous() }}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors"
              title="Previous"
            >
              <SkipBack size={14} className="text-white" />
            </button>

            {/* Play / Pause — large centre button */}
            <button
              onClick={e => { e.stopPropagation(); handleCardClick() }}
              className="w-14 h-14 rounded-full bg-brand hover:bg-brand/80 flex items-center justify-center shadow-lg transition-transform active:scale-95"
              title={isCurrent && isPlaying ? 'Pause' : 'Play'}
            >
              {isCurrent && isPlaying
                ? <Pause size={24} className="text-white" />
                : <Play  size={24} className="text-white ml-1" />
              }
            </button>

            {/* Next */}
            <button
              onClick={e => { e.stopPropagation(); next() }}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors"
              title="Next"
            >
              <SkipForward size={14} className="text-white" />
            </button>
          </div>

          {/* Badges */}
          {isCurrent && (
            <div className="absolute top-2 right-2 px-2 py-0.5 bg-brand text-white text-xs rounded-full font-medium pointer-events-none">
              {isPlaying ? 'Playing' : 'Paused'}
            </div>
          )}
          {track.source === 'upload' && !isCurrent && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full font-medium pointer-events-none">ZedVevo</div>
          )}
        </div>

        {/* ── Info + stats + actions ── */}
        <div className="p-3 space-y-2">
          {/* Title — links to detail page; artist below */}
          <div>
            <Link
              to={detailHref}
              onClick={e => e.stopPropagation()}
              className="text-sm font-medium text-text-primary hover:text-brand truncate block leading-snug transition-colors"
            >
              {track.title}
            </Link>
            <p className="text-xs text-text-muted truncate mt-0.5">{track.artist}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1" title="Plays">
              <Headphones size={11} /> {fmtCount(plays)}
            </span>
            <span className="flex items-center gap-1" title="Downloads">
              <Download size={11} /> {fmtCount(localDownloads)}
            </span>
            {track.genre && (
              <span className="ml-auto px-1.5 py-0.5 bg-bg-secondary rounded-full text-[10px] truncate max-w-[60px]">{track.genre}</span>
            )}
          </div>

          {/* Action bar */}
          <div
            className="flex items-center gap-1 pt-0.5 border-t border-border/50"
            onClick={e => e.stopPropagation()}
          >
            {/* Buy Now for locked premium */}
            {track.is_premium && !canAccess && (
              <button
                onClick={e => { e.stopPropagation(); if (profile) setPayOpen(true) }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 transition-colors text-xs font-semibold flex-shrink-0"
                title={`Buy — K${track.price ?? ''}`}
              >
                <ShoppingCart size={11} /> Buy K{track.price ?? ''}
              </button>
            )}
            <span className="flex-1" />
            {/* Download */}
            {canAccess && track.audio_url && (
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors text-xs"
                title="Download"
              >
                <Download size={13} />
                <span className="hidden sm:inline">Save</span>
              </button>
            )}
            {/* Share */}
            <div onClick={e => e.stopPropagation()}>
              <ShareMenu title={track.title} artist={track.artist} url={shareUrl} imageUrl={track.cover ?? undefined} />
            </div>
          </div>
        </div>
      </div>

      {payOpen && track.is_premium && profile && (
        <PaymentModal
          isOpen={payOpen} onClose={() => setPayOpen(false)} onSuccess={handlePaySuccess}
          amount={track.price!} contentType="song" contentId={track.id}
          description={`Purchase "${track.title}" by ${track.artist}`}
        />
      )}
    </>
  )
}
