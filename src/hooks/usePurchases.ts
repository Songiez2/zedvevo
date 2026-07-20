import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export function usePurchases() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['purchases', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user,
  })
}
