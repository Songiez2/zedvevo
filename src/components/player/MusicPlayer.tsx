import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, X, ListMusic, ChevronUp, ChevronDown
} from 'lucide-react'
import { usePlayerStore } from '@/stores/playerStore'
import { formatDuration } from '@/lib/utils'

export default function MusicPlayer() {
  const {
    currentTrack, isPlaying, volume, currentTime, duration, shuffle, repeat,
    setPlaying, setVolume, setCurrentTime, setDuration, next, previous,
    toggleShuffle, toggleRepeat, clearQueue, queue
  } = usePlayerStore()

  const audioRef = useRef<HTMLAudioElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [showQueue, setShowQueue] = useState(false)

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) audio.play().catch(() => setPlaying(false))
    else audio.pause()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrack])

  // Load new track
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.src = currentTrack.audio_url
    audio.volume = volume
    if (isPlaying) audio.play().catch(() => setPlaying(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime)
  }
  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration)
  }
  const handleEnded = () => next()
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (!currentTrack) return null

  return (
    <>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border"
      >
        {/* Expanded view */}
        {expanded && (
          <div className="max-w-lg mx-auto px-4 pt-4 pb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-text-muted uppercase tracking-wider">Now Playing</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowQueue(v => !v)} className={`p-1.5 rounded-lg transition-colors ${showQueue ? 'text-brand bg-brand/10' : 'text-text-muted hover:text-text-primary'}`}>
                  <ListMusic size={16} />
                </button>
                <button onClick={clearQueue} className="p-1.5 text-text-muted hover:text-danger rounded-lg transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {showQueue && (
              <div className="mb-3 max-h-40 overflow-y-auto space-y-1 border border-border rounded-lg p-2 bg-bg-card">
                {queue.length === 0
                  ? <p className="text-xs text-text-muted text-center py-2">Queue is empty</p>
                  : queue.map((t, i) => (
                    <div key={t.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${t.id === currentTrack.id ? 'bg-brand/10 text-brand' : 'text-text-secondary'}`}>
                      <span className="w-4 text-center text-text-muted">{i + 1}</span>
                      <span className="flex-1 truncate">{t.title}</span>
                      <span className="text-text-muted">{t.artist}</span>
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Track info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {currentTrack.cover
                ? <img src={currentTrack.cover} alt={currentTrack.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                : <div className="w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center flex-shrink-0">
                    <Play size={14} className="text-brand" />
                  </div>
              }
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{currentTrack.title}</p>
                <p className="text-xs text-text-muted truncate">{currentTrack.artist}</p>
              </div>
              <button onClick={() => setExpanded(v => !v)} className="p-1 text-text-muted hover:text-text-primary ml-1 hidden sm:block">
                {expanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div className="flex items-center gap-2">
                <button onClick={toggleShuffle} className={`p-1.5 rounded-lg transition-colors ${shuffle ? 'text-brand' : 'text-text-muted hover:text-text-primary'}`}>
                  <Shuffle size={14} />
                </button>
                <button onClick={previous} className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg transition-colors">
                  <SkipBack size={18} />
                </button>
                <button
                  onClick={() => setPlaying(!isPlaying)}
                  className="w-9 h-9 flex items-center justify-center bg-brand hover:bg-brand-hover rounded-full transition-colors"
                >
                  {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                </button>
                <button onClick={next} className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg transition-colors">
                  <SkipForward size={18} />
                </button>
                <button onClick={toggleRepeat} className={`p-1.5 rounded-lg transition-colors ${repeat !== 'none' ? 'text-brand' : 'text-text-muted hover:text-text-primary'}`}>
                  {repeat === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />}
                </button>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2 w-full max-w-md">
                <span className="text-xs text-text-muted w-8 text-right">{formatDuration(currentTime)}</span>
                <input
                  type="range" min={0} max={duration || 0} step={0.5}
                  value={currentTime} onChange={handleSeek}
                  className="flex-1 h-1 accent-brand"
                  style={{ background: `linear-gradient(to right, #2563EB ${progress}%, #1F2937 ${progress}%)` }}
                />
                <span className="text-xs text-text-muted w-8">{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2 flex-1 justify-end max-w-32">
              <button onClick={() => setVolume(volume > 0 ? 0 : 0.8)} className="p-1.5 text-text-muted hover:text-text-primary">
                {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <input
                type="range" min={0} max={1} step={0.05}
                value={volume} onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 accent-brand"
                style={{ background: `linear-gradient(to right, #2563EB ${volume * 100}%, #1F2937 ${volume * 100}%)` }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}
