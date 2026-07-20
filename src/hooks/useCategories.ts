import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Category, type HeroSlider } from '@/lib/supabase'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Category[]
    },
  })
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single()

      if (error) throw error
      return data as Category
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (category: Partial<Category>) => {
      const { data, error } = await supabase.from('categories').insert(category).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// Hero Sliders
export function useHeroSliders() {
  return useQuery({
    queryKey: ['heroSliders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_sliders')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as HeroSlider[]
    },
  })
}

export function useHeroSlider(id: string) {
  return useQuery({
    queryKey: ['heroSlider', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_sliders')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as HeroSlider
    },
  })
}

export function useCreateHeroSlider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (slider: Partial<HeroSlider>) => {
      const { data, error } = await supabase.from('hero_sliders').insert(slider).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heroSliders'] })
    },
  })
}

export function useUpdateHeroSlider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HeroSlider> & { id: string }) => {
      const { data, error } = await supabase
        .from('hero_sliders')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heroSliders'] })
    },
  })
}

export function useDeleteHeroSlider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hero_sliders').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heroSliders'] })
    },
  })
}
