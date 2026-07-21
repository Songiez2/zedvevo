import { Play, Pause, Heart, Download, Headphones } from 'lucide-react'
import { usePlayerStore } from '@/stores/playerStore'
import { useAuth } from '@/contexts/AuthContext'
import { likeSong, unlikeSong, isSongLiked } from '@/db/api'
import { formatDuration } from '@/lib/utils'
import ShareMenu from '@/components/ui/ShareMenu'
import type { ExternalMusic } from '@/types/types'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  track: ExternalMusic
  queue?: ExternalMusic[]
  index?: number
  showIndex?: boolean
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function TrackRow({ track, queue = [], index, showIndex = false }: Props) {
  const { currentTrack, isPlaying, setTrack, togglePlay } = usePlayerStore()
  const { profile } = useAuth()
  const isCurrent = currentTrack?.id === track.id
  const [liked, setLiked] = useState(false)
  const [localDownloads, setLocalDownloads] = useState(track.downloads ?? 0)

  useEffect(() => {
    if (profile) isSongLiked(profile.id, track.id).then(setLiked)
  }, [profile, track.id])

  const handlePlay = () => {
    if (isCurrent) togglePlay()
    else setTrack(track, queue.length > 0 ? queue : [track])
  }

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!profile) return
    if (liked) { await unlikeSong(profile.id, track.id); setLiked(false) }
    else { await likeSong(profile.id, track.id); setLiked(true) }
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

  const shareUrl = `${window.location.origin}/music/${track.id}`

  return (
    <div
      onClick={handlePlay}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-bg-card ${isCurrent ? 'bg-brand/5' : ''}`}
    >
      {/* Index / play icon */}
      <div className="w-8 flex-shrink-0 flex items-center justify-center">
        {isCurrent && isPlaying
          ? <Pause size={16} className="text-brand" />
          : showIndex
            ? <span className={`text-sm ${isCurrent ? 'text-brand' : 'text-text-muted'} group-hover:hidden`}>{(index ?? 0) + 1}</span>
            : null
        }
        <Play size={16} className={`text-text-primary ${showIndex ? 'hidden group-hover:block' : isCurrent && isPlaying ? 'hidden' : 'block'}`} />
      </div>

      {/* Cover */}
      {track.cover
        ? <img src={track.cover} alt={track.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        : <div className="w-9 h-9 rounded-lg bg-brand/20 flex items-center justify-center flex-shrink-0">
            <Play size={12} className="text-brand" />
          </div>
      }

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isCurrent ? 'text-brand' : 'text-text-primary'}`}>{track.title}</p>
        <p className="text-xs text-text-muted truncate">{track.artist}</p>
      </div>

      {/* Stats — always visible on md+ */}
      <div className="hidden md:flex items-center gap-3 text-xs text-text-muted flex-shrink-0">
        <span className="flex items-center gap-1" title="Plays">
          <Headphones size={11} /> {fmtCount(track.plays ?? 0)}
        </span>
        <span className="flex items-center gap-1" title="Downloads">
          <Download size={11} /> {fmtCount(localDownloads)}
        </span>
      </div>

      {/* Genre */}
      {track.genre && (
        <span className="hidden lg:block text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full flex-shrink-0">{track.genre}</span>
      )}

      {/* Actions — always visible */}
      <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
        {profile && (
          <button onClick={handleLike} className={`p-1.5 rounded-lg transition-colors ${liked ? 'text-danger' : 'text-text-muted hover:text-danger'}`}>
            <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
          </button>
        )}
        {track.audio_url && (
          <button onClick={handleDownload} className="p-1.5 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors" title="Download">
            <Download size={14} />
          </button>
        )}
        <ShareMenu title={track.title} artist={track.artist} url={shareUrl} imageUrl={track.cover ?? undefined} />
      </div>

      {/* Duration */}
      <span className="text-xs text-text-muted w-10 text-right flex-shrink-0 hidden sm:block">
        {track.duration ? formatDuration(track.duration) : '--'}
      </span>
    </div>
  )
}
