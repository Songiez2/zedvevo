import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Event, type Ticket } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function useEvents(limit = 20) {
  return useQuery({
    queryKey: ['events', { limit }],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, artist:artists(*)')
        .eq('is_active', true)
        .order('event_date', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data as Event[]
    },
  })
}

export function useFeaturedEvents(limit = 5) {
  return useQuery({
    queryKey: ['events', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, artist:artists(*)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('event_date', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data as Event[]
    },
  })
}

export function useUpcomingEvents(limit = 10) {
  return useQuery({
    queryKey: ['events', 'upcoming', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, artist:artists(*)')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data as Event[]
    },
  })
}

export function useEvent(slug: string) {
  return useQuery({
    queryKey: ['event', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, artist:artists(*)')
        .eq('slug', slug)
        .single()

      if (error) throw error
      return data as Event
    },
  })
}

export function useEventTickets(eventId: string) {
  return useQuery({
    queryKey: ['tickets', 'event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('event_id', eventId)
        .eq('status', 'available')

      if (error) throw error
      return data as Ticket[]
    },
  })
}

export function useArtistEvents(artistId: string) {
  return useQuery({
    queryKey: ['events', 'artist', artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('artist_id', artistId)
        .order('event_date', { ascending: false })

      if (error) throw error
      return data as Event[]
    },
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (event: Partial<Event>) => {
      const { data, error } = await supabase.from('events').insert(event).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function usePurchaseTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      quantity = 1,
    }: {
      eventId: string
      quantity?: number
    }) => {
      // Get event details
      const { data: event } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!event) throw new Error('Event not found')
      if (event.tickets_sold + quantity > event.total_tickets) {
        throw new Error('Not enough tickets available')
      }

      // Get user
      const user = useAuthStore.getState().user
      if (!user) throw new Error('Not authenticated')

      // Create payment for the ticket
      const { lipilaService } = await import('@/services')

      // For now, return success as the payment flow is handled separately
      return { success: true, paymentId: undefined }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useMyTickets() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    queryKey: ['tickets', 'user', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('tickets')
        .select('*, event:events(*, artist:artists(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (Ticket & { event: Event })[]
    },
  })
}
