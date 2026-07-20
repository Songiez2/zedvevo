import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Video, type Comment } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useVideos(genreId?: string, limit = 20) {
  return useQuery({
    queryKey: ['videos', { genreId, limit }],
    queryFn: async () => {
      let query = supabase
        .from('videos')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (genreId) {
        query = query.eq('genre_id', genreId)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Video[]
    },
  })
}

export function useFeaturedVideos(limit = 10) {
  return useQuery({
    queryKey: ['videos', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('is_featured', true)
        .eq('deleted_at', null)
        .order('view_count', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as Video[]
    },
  })
}

export function useTrendingVideos(limit = 20) {
  return useQuery({
    queryKey: ['videos', 'trending', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('deleted_at', null)
        .order('view_count', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as Video[]
    },
  })
}

export function useVideo(slug: string) {
  return useQuery({
    queryKey: ['video', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*, artist:artists(*), song:songs(*), genre:categories(*)')
        .eq('slug', slug)
        .single()

      if (error) throw error
      return data as Video
    },
  })
}

export function useArtistVideos(artistId: string) {
  return useQuery({
    queryKey: ['videos', 'artist', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*, song:songs(*), genre:categories(*)')
        .eq('artist_id', artistId)
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Video[]
    },
  })
}

export function useCreateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (video: Partial<Video>) => {
      const { data, error } = await supabase.from('videos').insert(video).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

export function useUpdateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Video> & { id: string }) => {
      const { data, error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

export function useDeleteVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('videos')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

export function useRecordPlay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      videoId,
      songId,
      durationPlayed,
      completed,
    }: {
      videoId?: string
      songId?: string
      durationPlayed?: number
      completed?: boolean
    }) => {
      const { error } = await supabase.from('plays').insert({
        song_id: songId,
        video_id: videoId,
        duration_played: durationPlayed,
        completed,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['songs'] })
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

// Comments Hooks
export function useVideoComments(videoId: string) {
  return useQuery({
    queryKey: ['comments', 'video', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:profiles(*), replies:comments(*, user:profiles(*))')
        .eq('video_id', videoId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (Comment & { replies: Comment[] })[]
    },
  })
}

export function useSongComments(songId: string) {
  return useQuery({
    queryKey: ['comments', 'song', songId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:profiles(*), replies:comments(*, user:profiles(*))')
        .eq('song_id', songId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (Comment & { replies: Comment[] })[]
    },
  })
}

export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (comment: Partial<Comment>) => {
      const { data, error } = await supabase.from('comments').insert(comment).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
  })
}

export function useDeleteComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] })
    },
  })
}
