import { create } from 'zustand'
import { ExternalMusic } from '@/types/types'

interface PlayerState {
  currentTrack: ExternalMusic | null
  queue: ExternalMusic[]
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  shuffle: boolean
  repeat: 'none' | 'one' | 'all'
  showMiniPlayer: boolean

  setTrack: (track: ExternalMusic, queue?: ExternalMusic[]) => void
  togglePlay: () => void
  setPlaying: (playing: boolean) => void
  setVolume: (volume: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  next: () => void
  previous: () => void
  toggleShuffle: () => void
  toggleRepeat: () => void
  addToQueue: (track: ExternalMusic) => void
  clearQueue: () => void
  setShowMiniPlayer: (show: boolean) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  volume: 0.8,
  currentTime: 0,
  duration: 0,
  shuffle: false,
  repeat: 'none',
  showMiniPlayer: false,

  setTrack: (track, queue = []) => set({ currentTrack: track, queue, isPlaying: true, currentTime: 0, showMiniPlayer: true }),
  togglePlay: () => set(s => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),

  next: () => {
    const { queue, currentTrack, shuffle, repeat } = get()
    if (!currentTrack || queue.length === 0) return
    const idx = queue.findIndex(t => t.id === currentTrack.id)
    if (repeat === 'one') { set({ currentTime: 0, isPlaying: true }); return }
    let nextIdx: number
    if (shuffle) nextIdx = Math.floor(Math.random() * queue.length)
    else nextIdx = idx + 1
    if (nextIdx >= queue.length) {
      if (repeat === 'all') nextIdx = 0
      else { set({ isPlaying: false }); return }
    }
    set({ currentTrack: queue[nextIdx], currentTime: 0, isPlaying: true })
  },

  previous: () => {
    const { queue, currentTrack, currentTime } = get()
    if (!currentTrack) return
    if (currentTime > 3) { set({ currentTime: 0 }); return }
    const idx = queue.findIndex(t => t.id === currentTrack.id)
    const prevIdx = Math.max(0, idx - 1)
    set({ currentTrack: queue[prevIdx], currentTime: 0, isPlaying: true })
  },

  toggleShuffle: () => set(s => ({ shuffle: !s.shuffle })),
  toggleRepeat: () => set(s => ({
    repeat: s.repeat === 'none' ? 'all' : s.repeat === 'all' ? 'one' : 'none'
  })),
  addToQueue: (track) => set(s => ({ queue: [...s.queue, track] })),
  clearQueue: () => set({ queue: [], currentTrack: null, isPlaying: false, showMiniPlayer: false }),
  setShowMiniPlayer: (show) => set({ showMiniPlayer: show }),
}))
