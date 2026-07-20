import { useQuery } from '@tanstack/react-query'
import { supabase, type Song, type Album, type Artist, type Video, type Merchandise, type Event } from '@/lib/supabase'

interface SearchResults {
  songs: Song[]
  albums: Album[]
  artists: Artist[]
  videos: Video[]
  merchandise: Merchandise[]
  events: Event[]
}

export function useSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async (): Promise<SearchResults> => {
      if (!query || query.length < 2) {
        return {
          songs: [],
          albums: [],
          artists: [],
          videos: [],
          merchandise: [],
          events: [],
        }
      }

      const searchTerm = `%${query}%`

      const [songsResult, albumsResult, artistsResult, videosResult, merchResult, eventsResult] =
        await Promise.all([
          supabase
            .from('songs')
            .select('*, artist:artists(*), genre:categories(*)')
            .eq('deleted_at', null)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),

          supabase
            .from('albums')
            .select('*, artist:artists(*)')
            .eq('deleted_at', null)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),

          supabase
            .from('artists')
            .select('*, user:profiles(*)')
            .or(`stage_name.ilike.${searchTerm},bio.ilike.${searchTerm}`),

          supabase
            .from('videos')
            .select('*, artist:artists(*)')
            .eq('deleted_at', null)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),

          supabase
            .from('merchandise')
            .select('*, seller:profiles(*), artist:artists(*)')
            .eq('is_active', true)
            .is('deleted_at', null)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
            .limit(5),

          supabase
            .from('events')
            .select('*, artist:artists(*)')
            .eq('is_active', true)
            .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},venue.ilike.${searchTerm}`),
        ])

      return {
        songs: (songsResult.data || []) as Song[],
        albums: (albumsResult.data || []) as Album[],
        artists: (artistsResult.data || []) as Artist[],
        videos: (videosResult.data || []) as Video[],
        merchandise: (merchResult.data || []) as Merchandise[],
        events: (eventsResult.data || []) as Event[],
      }
    },
    enabled: enabled && query.length >= 2,
  })
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ['globalSearch', query],
    queryFn: async () => {
      if (!query || query.length < 2) return []

      const searchTerm = `%${query}%`

      // Search across all content types
      const [songsResult, albumsResult, artistsResult, videosResult] = await Promise.all([
        supabase
          .from('songs')
          .select('id, title, slug, cover_url, duration')
          .eq('deleted_at', null)
          .ilike('title', searchTerm)
          .limit(10),

        supabase
          .from('albums')
          .select('id, title, slug, cover_url')
          .eq('deleted_at', null)
          .ilike('title', searchTerm)
          .limit(10),

        supabase
          .from('artists')
          .select('id, stage_name, cover_image_url')
          .ilike('stage_name', searchTerm)
          .limit(10),

        supabase
          .from('videos')
          .select('id, title, slug, thumbnail_url, duration')
          .eq('deleted_at', null)
          .ilike('title', searchTerm)
          .limit(10),
      ])

      const results: Array<{
        type: string
        id: string
        title: string
        subtitle: string
        image?: string
        slug: string
        duration?: number
      }> = []

      songsResult.data?.forEach((song: any) => {
        results.push({
          type: 'song',
          id: song.id,
          title: song.title,
          subtitle: 'Unknown Artist',
          image: song.cover_url,
          slug: song.slug,
          duration: song.duration,
        })
      })

      albumsResult.data?.forEach((album: any) => {
        results.push({
          type: 'album',
          id: album.id,
          title: album.title,
          subtitle: 'Unknown Artist',
          image: album.cover_url,
          slug: album.slug,
        })
      })

      artistsResult.data?.forEach((artist: any) => {
        results.push({
          type: 'artist',
          id: artist.id,
          title: artist.stage_name,
          subtitle: 'Artist',
          image: artist.cover_image_url,
          slug: artist.id,
        })
      })

      videosResult.data?.forEach((video: any) => {
        results.push({
          type: 'video',
          id: video.id,
          title: video.title,
          subtitle: 'Unknown Artist',
          image: video.thumbnail_url,
          slug: video.slug,
          duration: video.duration,
        })
      })

      return results
    },
    enabled: query.length >= 2,
  })
}
