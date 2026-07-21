import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Music, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistSongs, getArtistVideos, getArtistAlbums, followArtist, unfollowArtist, isFollowing } from '@/db/api'
import TrackRow from '@/components/music/TrackRow'
import EmptyState from '@/components/ui/EmptyState'
import PageSection from '@/components/ui/PageSection'
import { timeAgo as _timeAgo } from '@/lib/utils'

export default function ArtistPublicPage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [artist, setArtist] = useState<any>(null)
  const [songs, setSongs] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [albums, setAlbums] = useState<any[]>([])
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('profiles').select('*, artist:artists(*)').eq('id', id).maybeSingle(),
      getArtistSongs(id),
      getArtistVideos(id),
      getArtistAlbums(id),
    ]).then(([{ data: p }, s, v, a]) => {
      setArtist(p); setSongs(s); setVideos(v); setAlbums(a); setLoading(false)
    })
    if (profile) isFollowing(profile.id, id).then(setFollowing)
  }, [id, profile])

  const handleFollow = async () => {
    if (!profile || !id) return
    if (following) { await unfollowArtist(profile.id, id); setFollowing(false) }
    else { await followArtist(profile.id, id); setFollowing(true) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
  if (!artist) return <EmptyState title="Artist not found" />

  const artistData = artist.artist?.[0] || artist.artist || {}
  const trackList = songs.map(s => ({
    id: s.id, external_id: s.id, title: s.title, artist: artist.full_name || artist.username || 'Artist',
    album: s.album?.title || null, cover: s.cover_url, audio_url: s.audio_url,
    genre: s.genre, source: 'upload', duration: s.duration, plays: s.plays,
    downloads: s.downloads, is_premium: s.is_premium, price: s.price, created_at: s.created_at,
  }))

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="relative">
        {artistData.cover_url
          ? <img src={artistData.cover_url} alt={artist.full_name} className="w-full h-48 md:h-64 object-cover" />
          : <div className="w-full h-48 md:h-64 bg-gradient-to-br from-brand/20 to-bg-secondary" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary to-transparent" />
      </div>

      <PageSection>
        <div className="flex items-end gap-5 -mt-16 mb-8 relative z-10">
          {artist.avatar_url
            ? <img src={artist.avatar_url} alt={artist.full_name} className="w-24 h-24 rounded-2xl object-cover border-4 border-bg-primary flex-shrink-0" />
            : <div className="w-24 h-24 rounded-2xl bg-brand/20 flex items-center justify-center border-4 border-bg-primary flex-shrink-0 text-brand text-3xl font-bold">
                {(artist.full_name || artist.username || 'A')[0].toUpperCase()}
              </div>
          }
          <div className="flex-1 pb-2">
            <h1 className="text-2xl font-bold text-text-primary">{artist.full_name || artist.username || 'Artist'}</h1>
            {artistData.genre && <p className="text-sm text-text-muted">{artistData.genre}</p>}
            {artistData.location && <p className="text-xs text-text-muted mt-0.5">{artistData.location}</p>}
          </div>
          <div className="pb-2 flex items-center gap-3">
            <div className="text-center">
              <p className="text-sm font-semibold text-text-primary">{artistData.followers || 0}</p>
              <p className="text-xs text-text-muted">Followers</p>
            </div>
            {profile && profile.id !== id && (
              <button onClick={handleFollow}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors ${following ? 'bg-bg-card border border-border text-text-secondary hover:border-brand/50' : 'bg-brand hover:bg-brand-hover text-white'}`}>
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {artistData.bio && (
          <p className="text-sm text-text-secondary leading-relaxed mb-8 max-w-2xl">{artistData.bio}</p>
        )}

        {/* Songs */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Music size={18} className="text-brand" />
            <h2 className="text-base font-semibold text-text-primary">Songs ({songs.length})</h2>
          </div>
          {songs.length === 0
            ? <EmptyState title="No songs uploaded yet" />
            : <div className="space-y-1">{trackList.map((t, i) => <TrackRow key={t.id} track={t} queue={trackList} index={i} showIndex />)}</div>
          }
        </div>

        {/* Albums */}
        {albums.length > 0 && (
          <div className="mb-10">
            <h2 className="text-base font-semibold text-text-primary mb-5">Albums</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {albums.map(a => (
                <div key={a.id} className="bg-bg-card border border-border rounded-2xl overflow-hidden">
                  {a.cover_url ? <img src={a.cover_url} alt={a.title} className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-bg-secondary flex items-center justify-center"><Music size={24} className="text-text-muted" /></div>}
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{(a.songs || []).length} songs</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-text-primary mb-5">Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {videos.map(v => (
                <Link key={v.id} to={`/videos/${v.id}`} className="group block bg-bg-card border border-border rounded-2xl overflow-hidden hover:border-brand/30 transition-all">
                  <div className="relative aspect-video bg-bg-secondary">
                    {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Play size={24} className="text-text-muted" /></div>}
                  </div>
                  <div className="p-3"><p className="text-sm font-medium text-text-primary truncate">{v.title}</p></div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </PageSection>
    </div>
  )
}
