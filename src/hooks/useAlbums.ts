import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Album } from '@/lib/supabase'

export function useAlbums(genreId?: string) {
  return useQuery({
    queryKey: ['albums', genreId],
    queryFn: async (): Promise<Album[]> => {
      let query = supabase
        .from('albums')
        .select('*, artist:artists(*), genre:categories(*)')
        .eq('deleted_at', null)
        .order('created_at', { ascending: false })

      if (genreId) {
        query = query.eq('genre_id', genreId)
      }

      const { data, error } = await query.limit(50)

      if (error) throw error
      return data || []
    },
  })
}
