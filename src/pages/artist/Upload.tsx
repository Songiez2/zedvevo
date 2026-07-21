import { useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, Music, Video, Loader2, X, ImagePlus, Tag, Users, Mic2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createSong, uploadSongFile, uploadVideoFile, uploadCoverImage, createVideo, getActivePlan, getArtistAlbums } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'
import UploadProgress from '@/components/ui/UploadProgress'
import { ARTIST_PLANS } from '@/types/types'
import { formatDate } from '@/lib/utils'

type UploadType = 'song' | 'video'

interface ProgressState {
  label: string
  pct: number
  done: boolean
  error?: string
}

export default function ArtistUpload() {
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const [uploadType, setUploadType] = useState<UploadType>('song')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progresses, setProgresses] = useState<ProgressState[]>([])

  // Song form
  const [songTitle, setSongTitle] = useState('')
  const [songGenre, setSongGenre] = useState('')
  const [artistDisplayName, setArtistDisplayName] = useState('')
  const [featuredArtists, setFeaturedArtists] = useState('')
  const [producer, setProducer] = useState('')
  const [songPremium, setSongPremium] = useState(false)
  const [songPrice, setSongPrice] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [songCoverFile, setSongCoverFile] = useState<File | null>(null)
  const [songCoverPreview, setSongCoverPreview] = useState<string | null>(null)
  const [albumId, setAlbumId] = useState('')

  // Video form
  const [videoTitle, setVideoTitle] = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [videoGenre, setVideoGenre] = useState('')
  const [videoPremium, setVideoPremium] = useState(false)
  const [videoPrice, setVideoPrice] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [thumbPreview, setThumbPreview] = useState<string | null>(null)

  const songCoverRef = useRef<HTMLInputElement>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const { data: plan } = useQuery({ queryKey: ['artist-plan', profile?.id], queryFn: () => getActivePlan(profile!.id), enabled: !!profile })
  const { data: albums = [] } = useQuery({ queryKey: ['artist-albums', profile?.id], queryFn: () => getArtistAlbums(profile!.id), enabled: !!profile })

  const canUpload = profile?.role === 'admin' || (!!plan && new Date(plan.expires_at) > new Date())

  const setProg = (idx: number, update: Partial<ProgressState>) =>
    setProgresses(prev => prev.map((p, i) => i === idx ? { ...p, ...update } : p))

  const handleCoverChange = (file: File | null, type: 'song' | 'video') => {
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'song') { setSongCoverFile(file); setSongCoverPreview(url) }
    else { setThumbFile(file); setThumbPreview(url) }
  }

  const handleUploadSong = async () => {
    if (!profile || !audioFile || !songTitle.trim()) { setError('Title and audio file are required'); return }
    if (!canUpload) { setError('You need an active artist plan to upload'); return }
    setLoading(true); setError('')

    const steps: ProgressState[] = [
      { label: audioFile.name, pct: 0, done: false },
      ...(songCoverFile ? [{ label: songCoverFile.name, pct: 0, done: false }] : []),
    ]
    setProgresses(steps)

    try {
      const audioUrl = await uploadSongFile(profile.id, audioFile, (pct) => setProg(0, { pct }))
      setProg(0, { pct: 100, done: true })

      let coverUrl: string | null = null
      if (songCoverFile) {
        coverUrl = await uploadCoverImage('albums', profile.id, songCoverFile, (pct) => setProg(1, { pct }))
        setProg(1, { pct: 100, done: true })
      }

      const song = await createSong({
        artist_id: profile.id,
        album_id: albumId || null,
        title: songTitle.trim(),
        description: null,
        cover_url: coverUrl,
        audio_url: audioUrl,
        genre: songGenre || null,
        duration: null,
        is_premium: songPremium,
        price: songPremium ? parseFloat(songPrice) || null : null,
        published: true,
        artist_display_name: artistDisplayName.trim() || null,
        featured_artists: featuredArtists.trim() ? featuredArtists.split(',').map(s => s.trim()).filter(Boolean) : null,
        producer: producer.trim() || null,
      })

      qc.invalidateQueries({ queryKey: ['artist-songs'] })
      qc.invalidateQueries({ queryKey: ['trending'] })
      qc.invalidateQueries({ queryKey: ['new-releases'] })

      // Redirect to the uploaded song's detail page
      if (song?.id) navigate(`/music/${song.id}`)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
      setProgresses(prev => prev.map(p => p.done ? p : { ...p, error: 'failed' }))
    }
    setLoading(false)
  }

  const handleUploadVideo = async () => {
    if (!profile || !videoFile || !videoTitle.trim()) { setError('Title and video file are required'); return }
    if (!thumbFile) { setError('A thumbnail is required for music videos'); return }
    if (!canUpload) { setError('You need an active artist plan to upload'); return }
    setLoading(true); setError('')

    const steps: ProgressState[] = [
      { label: videoFile.name, pct: 0, done: false },
      { label: thumbFile.name, pct: 0, done: false },
    ]
    setProgresses(steps)

    try {
      const videoUrl = await uploadVideoFile(profile.id, videoFile, (pct) => setProg(0, { pct }))
      setProg(0, { pct: 100, done: true })

      const thumbUrl = await uploadCoverImage('images', profile.id, thumbFile, (pct) => setProg(1, { pct }))
      setProg(1, { pct: 100, done: true })

      const vid = await createVideo({
        artist_id: profile.id,
        title: videoTitle.trim(),
        description: videoDesc || null,
        thumbnail_url: thumbUrl,
        video_url: videoUrl,
        genre: videoGenre || null,
        duration: null,
        is_premium: videoPremium,
        price: videoPremium ? parseFloat(videoPrice) || null : null,
        published: true,
      })

      qc.invalidateQueries({ queryKey: ['videos-home'] })
      if (vid?.id) navigate(`/videos/${vid.id}`)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
      setProgresses(prev => prev.map(p => p.done ? p : { ...p, error: 'failed' }))
    }
    setLoading(false)
  }

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8 max-w-2xl">
        <h1 className="text-xl font-bold text-text-primary mb-2">Upload Content</h1>
        {plan
          ? <p className="text-sm text-text-muted mb-6">Plan: <span className="text-success font-medium">{ARTIST_PLANS[plan.plan]?.label ?? plan.plan}</span> · Expires {formatDate(plan.expires_at)}</p>
          : profile?.role === 'admin'
            ? <p className="text-sm text-text-muted mb-6">Admin — unlimited uploads enabled</p>
            : <div className="mb-6 px-4 py-3 bg-warning/10 border border-warning/20 rounded-xl text-sm text-warning">
                No active plan — <a href="/artist/subscription" className="underline font-medium">choose a plan to upload</a>
              </div>
        }

        {/* Type toggle */}
        <div className="flex gap-2 mb-7">
          {(['song', 'video'] as UploadType[]).map(t => (
            <button key={t} onClick={() => { setUploadType(t); setError(''); setProgresses([]) }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors capitalize
                ${uploadType === t ? 'bg-brand text-white' : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary'}`}>
              {t === 'song' ? <Music size={15} /> : <Video size={15} />} {t}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {uploadType === 'song' ? (
            <>
              {/* Thumbnail picker */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Cover Image</label>
                <div
                  onClick={() => songCoverRef.current?.click()}
                  className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-border hover:border-brand cursor-pointer overflow-hidden transition-colors flex items-center justify-center bg-bg-card">
                  {songCoverPreview
                    ? <img src={songCoverPreview} alt="cover" className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-1 text-text-muted"><ImagePlus size={24} /><span className="text-xs">Add Cover</span></div>}
                  {songCoverPreview && (
                    <button onClick={e => { e.stopPropagation(); setSongCoverFile(null); setSongCoverPreview(null) }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                      <X size={11} className="text-white" />
                    </button>
                  )}
                </div>
                <input ref={songCoverRef} type="file" accept="image/*" className="hidden"
                  onChange={e => handleCoverChange(e.target.files?.[0] || null, 'song')} />
              </div>

              <Field label="Title *"><input value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song title" /></Field>

              <Field label="Artist Name">
                <div className="relative">
                  <Mic2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input value={artistDisplayName} onChange={e => setArtistDisplayName(e.target.value)} placeholder="Display name (if different from profile)" className="!pl-8" />
                </div>
              </Field>

              <Field label="Featured Artists">
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input value={featuredArtists} onChange={e => setFeaturedArtists(e.target.value)} placeholder="e.g. Artist B, Artist C  (comma-separated)" className="!pl-8" />
                </div>
              </Field>

              <Field label="Producer">
                <div className="relative">
                  <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input value={producer} onChange={e => setProducer(e.target.value)} placeholder="Produced by…" className="!pl-8" />
                </div>
              </Field>

              <Field label="Genre"><input value={songGenre} onChange={e => setSongGenre(e.target.value)} placeholder="e.g. Zambian Music, Afrobeats" /></Field>

              <Field label="Album (optional)">
                <select value={albumId} onChange={e => setAlbumId(e.target.value)}
                  className="w-full bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand">
                  <option value="">None</option>
                  {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                </select>
              </Field>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={songPremium} onChange={e => setSongPremium(e.target.checked)} className="accent-brand" />
                  <span className="text-sm text-text-secondary">For sale (paid download)</span>
                </label>
                {songPremium && (
                  <input type="number" value={songPrice} onChange={e => setSongPrice(e.target.value)}
                    placeholder="Price (K)" className="w-28 bg-bg-card border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary outline-none focus:border-brand" />
                )}
              </div>

              <FileField label="Audio File * (MP3 or WAV)" accept=".mp3,.wav,audio/mpeg,audio/wav" onChange={setAudioFile} file={audioFile} />

              {/* Progress bars */}
              {progresses.map((p, i) => <UploadProgress key={i} label={p.label} progress={p.pct} done={p.done} error={p.error} />)}

              {error && <p className="text-sm text-danger">{error}</p>}

              <button onClick={handleUploadSong} disabled={loading || !canUpload}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {loading ? 'Uploading…' : 'Upload Song'}
              </button>
            </>
          ) : (
            <>
              {/* Video thumbnail picker */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Thumbnail * <span className="text-danger text-xs">(required)</span></label>
                <div
                  onClick={() => thumbRef.current?.click()}
                  className="relative w-48 h-28 rounded-2xl border-2 border-dashed border-border hover:border-brand cursor-pointer overflow-hidden transition-colors flex items-center justify-center bg-bg-card">
                  {thumbPreview
                    ? <img src={thumbPreview} alt="thumb" className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-1 text-text-muted"><ImagePlus size={24} /><span className="text-xs">Add Thumbnail</span></div>}
                  {thumbPreview && (
                    <button onClick={e => { e.stopPropagation(); setThumbFile(null); setThumbPreview(null) }}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                      <X size={11} className="text-white" />
                    </button>
                  )}
                </div>
                <input ref={thumbRef} type="file" accept="image/*" className="hidden"
                  onChange={e => handleCoverChange(e.target.files?.[0] || null, 'video')} />
              </div>

              <Field label="Title *"><input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder="Video title" /></Field>
              <Field label="Description"><textarea value={videoDesc} onChange={e => setVideoDesc(e.target.value)} rows={2} placeholder="Brief description…" className="resize-none" /></Field>
              <Field label="Genre"><input value={videoGenre} onChange={e => setVideoGenre(e.target.value)} placeholder="e.g. Zambian Music" /></Field>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={videoPremium} onChange={e => setVideoPremium(e.target.checked)} className="accent-brand" />
                  <span className="text-sm text-text-secondary">For sale (paid)</span>
                </label>
                {videoPremium && (
                  <input type="number" value={videoPrice} onChange={e => setVideoPrice(e.target.value)}
                    placeholder="Price (K)" className="w-28 bg-bg-card border border-border rounded-xl px-3 py-1.5 text-sm text-text-primary outline-none focus:border-brand" />
                )}
              </div>

              <FileField label="Video File * (MP4 only)" accept="video/mp4" onChange={setVideoFile} file={videoFile} />

              {/* Progress bars */}
              {progresses.map((p, i) => <UploadProgress key={i} label={p.label} progress={p.pct} done={p.done} error={p.error} />)}

              {error && <p className="text-sm text-danger">{error}</p>}

              <button onClick={handleUploadVideo} disabled={loading || !canUpload}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {loading ? 'Uploading…' : 'Upload Video'}
              </button>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
      <div className="[&>input]:w-full [&>input]:bg-bg-card [&>input]:border [&>input]:border-border [&>input]:rounded-xl [&>input]:px-3 [&>input]:py-2.5 [&>input]:text-sm [&>input]:text-text-primary [&>input]:outline-none [&>input]:focus:border-brand [&>input]:placeholder:text-text-muted [&>input]:transition-colors [&>div>input]:w-full [&>div>input]:bg-bg-card [&>div>input]:border [&>div>input]:border-border [&>div>input]:rounded-xl [&>div>input]:px-3 [&>div>input]:py-2.5 [&>div>input]:text-sm [&>div>input]:text-text-primary [&>div>input]:outline-none [&>div>input]:focus:border-brand [&>div>input]:placeholder:text-text-muted [&>div>input]:transition-colors [&>textarea]:w-full [&>textarea]:bg-bg-card [&>textarea]:border [&>textarea]:border-border [&>textarea]:rounded-xl [&>textarea]:px-3 [&>textarea]:py-2.5 [&>textarea]:text-sm [&>textarea]:text-text-primary [&>textarea]:outline-none [&>textarea]:focus:border-brand [&>textarea]:placeholder:text-text-muted [&>textarea]:transition-colors">
        {children}
      </div>
    </div>
  )
}

function FileField({ label, accept, onChange, file }: { label: string; accept: string; onChange: (f: File | null) => void; file: File | null }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
      <label className={`flex items-center gap-3 px-4 py-3 bg-bg-card border border-dashed rounded-xl cursor-pointer transition-colors ${file ? 'border-success/40' : 'border-border hover:border-brand'}`}>
        <Upload size={16} className={file ? 'text-success' : 'text-text-muted'} />
        <span className="text-sm text-text-muted truncate">{file ? file.name : 'Click to select file'}</span>
        <input type="file" accept={accept} onChange={e => onChange(e.target.files?.[0] || null)} className="hidden" />
      </label>
    </div>
  )
}
