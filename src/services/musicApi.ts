import { supabase } from '@/lib/supabase'
import { ExternalMusic, Song } from '@/types/types'

// Convert database Song to ExternalMusic format
export function songToExternalMusic(
  s: Song & {
    artist?: {
      id?: string
      username?: string
      full_name?: string
      avatar_url?: string
    }
  }
): ExternalMusic {
  return {
    id: s.id,
    external_id: s.id,
    title: s.title,
    artist:
      s.artist_display_name ||
      s.artist?.full_name ||
      s.artist?.username ||
      'Artist',
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


// Get ZedVevo uploaded songs
async function getUploadedSongs(limit: number): Promise<ExternalMusic[]> {
  const { data, error } = await supabase
    .from('songs')
    .select(`
      *,
      artist:profiles (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Songs loading error:', error)
    return []
  }

  if (!Array.isArray(data)) return []

  return data.map((song: any) =>
    songToExternalMusic(song)
  )
}


// Get all songs
export async function getSongs(
  params: {
    genre?: string
    limit?: number
    offset?: number
  } = {}
): Promise<ExternalMusic[]> {

  const {
    genre,
    limit = 30
  } = params


  let songs = await getUploadedSongs(limit)


  if (genre) {
    songs = songs.filter(
      song => song.genre === genre
    )
  }


  return songs
}


// Trending songs
export async function getTrendingSongs(
  limit = 20
): Promise<ExternalMusic[]> {

  return getUploadedSongs(limit)

}


// New releases
export async function getNewReleases(
  limit = 20
): Promise<ExternalMusic[]> {

  return getUploadedSongs(limit)

}


// Search music
export async function searchMusic(
  query: string,
  limit = 30
): Promise<ExternalMusic[]> {

  const { data, error } = await supabase
    .from('songs')
    .select(`
      *,
      artist:profiles (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('published', true)
    .or(
      `title.ilike.%${query}%,genre.ilike.%${query}%`
    )
    .limit(limit)


  if (error) {
    console.error('Search error:', error)
    return []
  }


  return (data || []).map((song:any)=>
    songToExternalMusic(song)
  )
}


// Albums placeholder
export async function getAlbums(
  limit = 20
): Promise<
{
  id:string
  name:string
  artist:string
  cover:string|null
}[]
> {

  const { data } = await supabase
    .from('albums')
    .select(`
      *,
      artist:profiles(
        full_name,
        username
      )
    `)
    .limit(limit)


  if (!data) return []


  return data.map((album:any)=>({
    id: album.id,
    name: album.title || album.name,
    artist:
      album.artist?.full_name ||
      album.artist?.username ||
      'Artist',
    cover: album.cover_url || null
  }))
}


// Artists
export async function getArtists(
  limit = 20
): Promise<
{
 id:string
 name:string
 cover:string|null
 website:string|null
}[]
>{

 const {data}=await supabase
  .from('profiles')
  .select('*')
  .limit(limit)


 if(!data) return []


 return data.map((artist:any)=>({
  id:artist.id,
  name:
   artist.full_name ||
   artist.username ||
   'Artist',
  cover:artist.avatar_url || null,
  website:null
 }))
}


// Convert external music helper
export function mapExternalMusic(
 data:any
):ExternalMusic{

 return {
  id:data.id,
  external_id:data.id,
  title:data.title,
  artist:data.artist,
  album:data.album,
  cover:data.cover,
  audio_url:data.audio_url,
  genre:data.genre,
  source:data.source,
  duration:data.duration,
  is_premium:data.is_premium,
  price:data.price,
  plays:data.plays || 0,
  downloads:data.downloads || 0,
  created_at:data.created_at
 }
}