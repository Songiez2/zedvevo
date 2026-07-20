import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Song, type Album, type Artist, type Playlist } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Songs Hooks
export function useSongs(genreId?: string, limit = 20) {
  return useQuery({
    queryKey: ['songs', { genreId, limit }],
    queryFn: async () => {
      let query = supabase
        .from('songs')
        .select('*, artist:artists(*), album:albums(*), genre:categories(*)')
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (genreId) {
        query = query.eq('genre_id', genreId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Song[]
    },
  })
}

export function useFeaturedSongs(limit = 10) {
  return useQuery({
    queryKey: ['songs', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('is_featured', true)
        .eq('deleted_at', null)
        .order('play_count', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as Song[]
    },
  })
}

export function useTrendingSongs(limit = 20) {
  return useQuery({
    queryKey: ['songs', 'trending', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('deleted_at', null)
        .order('play_count', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as Song[]
    },
  })
}

export function useSong(slug: string) {
  return useQuery({
    queryKey: ['song', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*, artist:artists(*), album:albums(*), genre:categories(*)')
        .eq('slug', slug)
        .single()

      if (error) throw error
      return data as Song
    },
  })
}

export function useArtistSongs(artistId: string) {
  return useQuery({
    queryKey: ['songs', 'artist', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('songs')
        .select('*, album:albums(*), genre:categories(*)')
        .eq('artist_id', artistId)
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Song[]
    },
  })
}

export function useCreateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (song: Partial<Song>) => {
      const { data, error } = await supabase.from('songs').insert(song).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })
}

export function useUpdateSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Song> & { id: string }) => {
      const { data, error } = await supabase
        .from('songs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })
}

export function useDeleteSong() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('songs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
    },
  })
}

// Albums Hooks
export function useAlbums(genreId?: string, limit = 20) {
  return useQuery({
    queryKey: ['albums', { genreId, limit }],
    queryFn: async () => {
      let query = supabase
        .from('albums')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (genreId) {
        query = query.eq('genre_id', genreId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Album[]
    },
  })
}

export function useFeaturedAlbums(limit = 10) {
  return useQuery({
    queryKey: ['albums', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('is_featured', true)
        .eq('deleted_at', null)
        .order('total_streams', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as Album[]
    },
  })
}

export function useAlbum(slug: string) {
  return useQuery({
    queryKey: ['album', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('slug', slug)
        .single()

      if (error) throw error
      return data as Album
    },
  })
}

export function useAlbumWithSongs(slug: string) {
  return useQuery({
    queryKey: ['album', slug, 'songs'],
    queryFn: async () => {
      const { data: album, error: albumError } = await supabase
        .from('albums')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('slug', slug)
        .single()

      if (albumError) throw albumError

      const { data: songs, error: songsError } = await supabase
        .from('songs')
        .select('*, genre:categories(*)')
        .eq('album_id', album.id)
        .eq('deleted_at', null)
        .order('created_at', { ascending: true })

      if (songsError) throw songsError

      return { ...album, songs } as Album & { songs: Song[] }
    },
  })
}

export function useArtistAlbums(artistId: string) {
  return useQuery({
    queryKey: ['albums', 'artist', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('albums')
        .select('*, genre:categories(*)')
        .eq('artist_id', artistId)
        .eq('deleted_at', null)
        .order('release_date', { ascending: false })

      if (error) throw error
      return data as Album[]
    },
  })
}

export function useCreateAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (album: Partial<Album>) => {
      const { data, error } = await supabase.from('albums').insert(album).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })
}

export function useUpdateAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Album> & { id: string }) => {
      const { data, error } = await supabase
        .from('albums')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })
}

export function useDeleteAlbum() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('albums')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['albums'] })
    },
  })
}

// Artists Hooks
export function useArtists(limit = 20) {
  return useQuery({
    queryKey: ['artists', { limit }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*, user:profiles(*)')
        .order('total_followers', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as Artist[]
    },
  })
}

export function useFeaturedArtists(limit = 10) {
  return useQuery({
    queryKey: ['artists', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*, user:profiles(*)')
        .eq('featured', true)
        .order('total_followers', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as Artist[]
    },
  })
}

export function useArtist(artistId: string) {
  return useQuery({
    queryKey: ['artist', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*, user:profiles(*)')
        .eq('id', artistId)
        .single()

      if (error) throw error
      return data as Artist
    },
  })
}

export function useCreateArtist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (artist: Partial<Artist>) => {
      const { data, error } = await supabase.from('artists').insert(artist).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}

export function useUpdateArtist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Artist> & { id: string }) => {
      const { data, error } = await supabase
        .from('artists')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}

export function useFollowArtist() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: async (artistId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('follows').insert({
        follower_id: user.id,
        artist_id: artistId,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] })
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}

export function useUnfollowArtist() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: async (artistId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('artist_id', artistId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follows'] })
      queryClient.invalidateQueries({ queryKey: ['artists'] })
    },
  })
}

// Playlists Hooks
export function usePlaylists() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    queryKey: ['playlists', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Playlist[]
    },
  })
}

export function usePlaylist(playlistId: string) {
  return useQuery({
    queryKey: ['playlist', playlistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('playlists')
        .select('*, user:profiles(*)')
        .eq('id', playlistId)
        .single()

      if (error) throw error
      return data as Playlist
    },
  })
}

export function usePlaylistWithSongs(playlistId: string) {
  return useQuery({
    queryKey: ['playlist', playlistId, 'songs'],
    queryFn: async () => {
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select('*, user:profiles(*)')
        .eq('id', playlistId)
        .single()

      if (playlistError) throw playlistError

      const { data: playlistSongs, error: songsError } = await supabase
        .from('playlist_songs')
        .select('*, song:songs(*, artist:artists(*), genre:categories(*))')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true })

      if (songsError) throw songsError

      return { ...playlist, songs: playlistSongs } as Playlist & { songs: { song: Song }[] }
    },
  })
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: async (playlist: Partial<Playlist>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('playlists')
        .insert({ ...playlist, user_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}

export function useAddToPlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: string; songId: string }) => {
      // Get current max position
      const { data: existingSongs } = await supabase
        .from('playlist_songs')
        .select('position')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: false })
        .limit(1)

      const position = (existingSongs?.[0]?.position || 0) + 1

      const { error } = await supabase.from('playlist_songs').insert({
        playlist_id: playlistId,
        song_id: songId,
        position,
      })

      if (error) throw error

      // Update playlist song count
      await supabase.rpc('increment', {
        table_name: 'playlists',
        row_id: playlistId,
        column_name: 'song_count',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist'] })
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}

export function useRemoveFromPlaylist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: string; songId: string }) => {
      const { error } = await supabase
        .from('playlist_songs')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('song_id', songId)

      if (error) throw error

      // Update playlist song count
      await supabase.rpc('decrement', {
        table_name: 'playlists',
        row_id: playlistId,
        column_name: 'song_count',
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlist'] })
      queryClient.invalidateQueries({ queryKey: ['playlists'] })
    },
  })
}

// Favorites Hooks
export function useFavorites() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('favorites')
        .select('*, song:songs(*, artist:artists(*)), album:albums(*), artist:artists(*), video:videos(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useFavoriteSong(songId: string) {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    queryKey: ['favorites', 'song', songId, user?.id],
    queryFn: async () => {
      if (!user) return null

      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('song_id', songId)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!user,
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: async (songId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('song_id', songId)
        .single()

      if (existing) {
        await supabase.from('favorites').delete().eq('id', existing.id)
        return { action: 'removed' }
      } else {
        await supabase.from('favorites').insert({
          user_id: user.id,
          song_id: songId,
        })
        return { action: 'added' }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}
