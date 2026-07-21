import { supabase } from '@/lib/supabase'
import { ExternalMusic, Song } from '@/types/types'

// Convert a Song (artist upload) to ExternalMusic shape so the same TrackCard can render it
export function songToExternalMusic(s: Song & { artist?: { id?: string; username?: string; full_name?: string } }): ExternalMusic {
  return {
    id: s.id,
    external_id: s.id,
    title: s.title,
    artist: s.artist_display_name || s.artist?.full_name || s.artist?.username || 'Artist',
    album: null,
    cover: s.cover_url,
    audio_url: s.audio_url,
    genre: s.genre,
    source: 'upload',
    duration: s.duration,
    is_premium: s.is_premium,
    price: s.price,
    plays: s.plays,
    downloads: s.downloads,
    created_at: s.created_at,
  }
}

// Fetch uploaded songs from the `songs` table, converted to ExternalMusic shape
async function getUploadedSongs(limit: number): Promise<ExternalMusic[]> {
  const { data } = await supabase
    .from('songs')
    .select('*, artist:profiles(id,username,full_name,avatar_url)')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (!Array.isArray(data) || data.length === 0) return []
  return data.map(songToExternalMusic)
}

const JAMENDO_API = 'https://api.jamendo.com/v3.0'

function getClientId(): string {
  return import.meta.env.VITE_JAMENDO_CLIENT_ID || ''
}

async function jamendoFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const clientId = getClientId()
  if (!clientId) return []

  const url = new URL(`${JAMENDO_API}${endpoint}`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('audioformat', 'mp32')
  url.searchParams.set('include', 'musicinfo')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Jamendo API error: ${res.status}`)
  const data = await res.json()
  return data.results || []
}

function mapTrack(t: Record<string, unknown>): Omit<ExternalMusic, 'id' | 'created_at' | 'plays' | 'downloads'> {
  const musicinfo = t.musicinfo as Record<string, unknown> | undefined
  const tags = musicinfo?.tags as Record<string, string[]> | undefined
  return {
    external_id: String(t.id),
    title: t.name as string,
    artist: t.artist_name as string,
    album: t.album_name as string | null,
    cover: t.album_image as string | null,
    audio_url: t.audio as string,
    genre: tags?.genres?.[0] || null,
    source: 'jamendo',
    duration: t.duration as number | null,
    is_premium: false,
    price: null,
  }
}

async function cacheToSupabase(tracks: ReturnType<typeof mapTrack>[]): Promise<ExternalMusic[]> {
  if (tracks.length === 0) return []
  const { data } = await supabase
    .from('external_music')
    .upsert(tracks, { onConflict: 'external_id,source' })
    .select()
  return Array.isArray(data) ? data : []
}

export async function getTrendingSongs(limit = 20): Promise<ExternalMusic[]> {
  // Uploaded songs come first — they are the primary content
  const uploaded = await getUploadedSongs(limit)

  const remaining = limit - uploaded.length
  if (remaining <= 0) return uploaded

  // Fill remainder from Jamendo cache
  const { data: cached } = await supabase
    .from('external_music')
    .select('*')
    .eq('source', 'jamendo')
    .order('plays', { ascending: false })
    .limit(remaining)
  const external = Array.isArray(cached) ? cached : []

  // Only fetch fresh from Jamendo if cache is empty
  if (external.length === 0) {
    const tracks = await jamendoFetch<Record<string, unknown>>('/tracks', { order: 'popularity_total', limit: remaining.toString() })
    if (tracks.length > 0) {
      const fresh = await cacheToSupabase(tracks.map(mapTrack))
      return [...uploaded, ...fresh]
    }
  }

  return [...uploaded, ...external]
}

export async function getNewReleases(limit = 20): Promise<ExternalMusic[]> {
  // Uploaded songs are always newest — prepend them
  const uploaded = await getUploadedSongs(limit)

  const remaining = limit - uploaded.length
  if (remaining <= 0) return uploaded

  const { data: cached } = await supabase
    .from('external_music')
    .select('*')
    .eq('source', 'jamendo')
    .order('created_at', { ascending: false })
    .limit(remaining)
  const external = Array.isArray(cached) ? cached : []

  if (external.length === 0) {
    const tracks = await jamendoFetch<Record<string, unknown>>('/tracks', { order: 'releasedate', limit: remaining.toString() })
    if (tracks.length > 0) {
      const fresh = await cacheToSupabase(tracks.map(mapTrack))
      return [...uploaded, ...fresh]
    }
  }

  return [...uploaded, ...external]
}

export async function getSongs(params: { genre?: string; limit?: number; offset?: number } = {}): Promise<ExternalMusic[]> {
  const { genre, limit = 30, offset = 0 } = params

  let query = supabase.from('external_music').select('*').eq('source', 'jamendo').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (genre) query = query.eq('genre', genre)

  const { data: cached } = await query
  if (cached && cached.length > 0) return cached

  const fetchParams: Record<string, string> = { limit: limit.toString() }
  if (genre) fetchParams.tags = genre.toLowerCase()
  const tracks = await jamendoFetch<Record<string, unknown>>('/tracks', fetchParams)
  if (tracks.length === 0) return []
  return cacheToSupabase(tracks.map(mapTrack))
}

export async function searchMusic(query: string, limit = 30): Promise<ExternalMusic[]> {
  // Search local cache first
  const { data: cached } = await supabase
    .from('external_music')
    .select('*')
    .or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`)
    .order('plays', { ascending: false })
    .limit(limit)
  if (cached && cached.length > 0) return cached

  const clientId = getClientId()
  if (!clientId) return []

  const tracks = await jamendoFetch<Record<string, unknown>>('/tracks', { namesearch: query, limit: limit.toString() })
  if (tracks.length === 0) return []
  return cacheToSupabase(tracks.map(mapTrack))
}

export async function getAlbums(limit = 20): Promise<{ id: string; name: string; artist: string; cover: string | null }[]> {
  const clientId = getClientId()
  if (!clientId) return []

  const url = new URL(`${JAMENDO_API}/albums`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', limit.toString())
  url.searchParams.set('order', 'popularity_total')

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return (data.results || []).map((a: Record<string, unknown>) => ({
    id: String(a.id),
    name: a.name as string,
    artist: a.artist_name as string,
    cover: a.image as string | null,
  }))
}

export async function getArtists(limit = 20): Promise<{ id: string; name: string; cover: string | null; website: string | null }[]> {
  const clientId = getClientId()
  if (!clientId) return []

  const url = new URL(`${JAMENDO_API}/artists`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', limit.toString())
  url.searchParams.set('order', 'popularity_total')

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const data = await res.json()
  return (data.results || []).map((a: Record<string, unknown>) => ({
    id: String(a.id),
    name: a.name as string,
    cover: a.image as string | null,
    website: a.website as string | null,
  }))
}
