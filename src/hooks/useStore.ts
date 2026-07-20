import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Merchandise, type Order, type OrderItem } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { lipilaService } from '@/services'

export function useMerchandise(category?: string, limit = 20) {
  return useQuery({
    queryKey: ['merchandise', { category, limit }],
    queryFn: async () => {
      let query = supabase
        .from('merchandise')
        .select('*, seller:profiles(*), artist:artists(*)')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query
      if (error) throw error
      return data as Merchandise[]
    },
  })
}

export function useFeaturedMerchandise(limit = 10) {
  return useQuery({
    queryKey: ['merchandise', 'featured', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*, seller:profiles(*), artist:artists(*)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .is('deleted_at', null)
        .order('sold_count', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data as Merchandise[]
    },
  })
}

export function useMerchandiseItem(slug: string) {
  return useQuery({
    queryKey: ['merchandise', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*, seller:profiles(*), artist:artists(*)')
        .eq('slug', slug)
        .single()

      if (error) throw error
      return data as Merchandise
    },
  })
}

export function useSellerMerchandise(sellerId: string) {
  return useQuery({
    queryKey: ['merchandise', 'seller', sellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Merchandise[]
    },
  })
}

export function useCreateMerchandise() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: async (merchandise: Partial<Merchandise>) => {
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('merchandise')
        .insert({ ...merchandise, seller_id: user.id })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchandise'] })
    },
  })
}

export function useUpdateMerchandise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Merchandise> & { id: string }) => {
      const { data, error } = await supabase
        .from('merchandise')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchandise'] })
    },
  })
}

export function useDeleteMerchandise() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('merchandise')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchandise'] })
    },
  })
}

// Orders
export function useOrders() {
  const user = useAuthStore((state) => state.user)

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*, merchandise:merchandise(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as (Order & { items: OrderItem[] })[]
    },
  })
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, items:order_items(*, merchandise:merchandise(*))')
        .eq('id', orderId)
        .single()

      if (error) throw error
      return data as Order & { items: OrderItem[] }
    },
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: async ({
      items,
      shippingAddress,
      notes,
    }: {
      items: { merchandise_id: string; quantity: number; size?: string; color?: string }[]
      shippingAddress: Record<string, string>
      notes?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      // Get merchandise details for price calculation
      const merchandiseIds = items.map((i) => i.merchandise_id)
      const { data: merchandiseItems } = await supabase
        .from('merchandise')
        .select('id, price')
        .in('id', merchandiseIds)

      if (!merchandiseItems) throw new Error('Could not fetch merchandise')

      const subtotal = items.reduce((sum, item) => {
        const merch = merchandiseItems.find((m) => m.id === item.merchandise_id)
        return sum + (merch?.price || 0) * item.quantity
      }, 0)

      const shippingFee = subtotal >= 500 ? 0 : 50
      const total = subtotal + shippingFee

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          subtotal,
          shipping_fee: shippingFee,
          total,
          shipping_address: shippingAddress,
          notes,
          status: 'pending',
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map((item) => {
        const merch = merchandiseItems.find((m) => m.id === item.merchandise_id)
        return {
          order_id: order.id,
          merchandise_id: item.merchandise_id,
          quantity: item.quantity,
          unit_price: merch?.price || 0,
          total_price: (merch?.price || 0) * item.quantity,
          size: item.size,
          color: item.color,
        }
      })

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      return order
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (orderId: string) => {
      // Get order details
      const { data: order } = await supabase
        .from('orders')
        .select('*, items:order_items(*, merchandise:merchandise(*))')
        .eq('id', orderId)
        .single()

      if (!order) throw new Error('Order not found')

      // For now, return success as the payment flow is handled separately
      return { success: true, paymentId: undefined }
    },
  })
}
