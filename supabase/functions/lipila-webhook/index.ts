// supabase/functions/lipila-webhook/index.ts
// Lipila Payment Webhook Handler

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LipilaWebhookPayload {
  reference: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  amount?: number
  paymentId?: string
  message?: string
  timestamp: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: LipilaWebhookPayload = await req.json()
    console.log('Received Lipila webhook:', JSON.stringify(payload))

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('reference_id', payload.reference)
      .single()

    if (paymentError || !payment) {
      console.error('Payment not found for reference:', payload.reference)
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const newStatus = payload.status === 'completed' ? 'completed' 
      : payload.status === 'failed' ? 'failed' 
      : payload.status === 'refunded' ? 'refunded' 
      : 'pending'

    await supabase
      .from('payments')
      .update({
        status: newStatus,
        completed_at: payload.status === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', payment.id)

    if (payload.status === 'completed') {
      await handleSuccessfulPayment(supabase, payment)
    }

    await supabase.from('notifications').insert({
      user_id: payment.user_id,
      type: 'payment_success',
      title: payload.status === 'completed' ? 'Payment Successful' : `Payment ${payload.status}`,
      message: payload.message || `Your payment of ZMW ${payload.amount} has been processed.`,
      data: { payment_id: payment.id, status: payload.status },
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handleSuccessfulPayment(supabase: any, payment: any) {
  const metadata = payment.metadata || {}
  const userId = payment.user_id

  switch (payment.payment_type) {
    case 'artist_subscription':
      await handleArtistSubscription(supabase, userId, metadata.item_id, payment.id)
      break
    case 'song_purchase':
      await createPurchase(supabase, userId, 'song', metadata.item_id, payment.amount, payment.id)
      break
    case 'album_purchase':
      await createPurchase(supabase, userId, 'album', metadata.item_id, payment.amount, payment.id)
      break
    case 'video_purchase':
      await createPurchase(supabase, userId, 'video', metadata.item_id, payment.amount, payment.id)
      break
    case 'ticket':
      await createTicket(supabase, userId, metadata.item_id, payment.id, payment.amount)
      break
    case 'merchandise':
      await updateOrderStatus(supabase, metadata.item_id, payment.id)
      break
  }
}

async function handleArtistSubscription(supabase: any, userId: string, planType: string, paymentId: string) {
  const planDurations: Record<string, number> = { daily: 1, weekly: 7, annual: 365 }
  const planLimits: Record<string, number> = { daily: 1, weekly: 8, annual: -1 }

  const duration = planDurations[planType] || 7
  const songLimit = planLimits[planType] || -1

  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + duration)

  await supabase.from('artist_subscriptions').insert({
    user_id: userId,
    plan: planType,
    status: 'active',
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    song_limit: songLimit,
    upload_count: 0,
    price: 0,
    currency: 'ZMW',
    payment_id: paymentId,
    auto_renew: false,
  })

  await supabase.from('profiles').update({ is_artist: true, role: 'artist' }).eq('id', userId)

  const { data: artistExists } = await supabase.from('artists').select('id').eq('user_id', userId).single()
  if (!artistExists) {
    const { data: userData } = await supabase.from('profiles').select('full_name, username').eq('id', userId).single()
    await supabase.from('artists').insert({
      user_id: userId,
      stage_name: userData?.full_name || userData?.username || 'New Artist',
    })
  }

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'artist_activated',
    title: 'Artist Account Activated!',
    message: `Your ${planType} artist plan is now active. You can start uploading music!`,
    data: { plan: planType },
  })
}

async function createPurchase(supabase: any, userId: string, itemType: string, itemId: string, price: number, paymentId: string) {
  await supabase.from('purchases').insert({ user_id: userId, item_type: itemType, item_id: itemId, price, payment_id: paymentId })
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'purchase_complete',
    title: 'Purchase Complete',
    message: `Your ${itemType} has been unlocked and is now available in your library.`,
    data: { item_type: itemType, item_id: itemId },
  })
}

async function createTicket(supabase: any, userId: string, eventId: string, paymentId: string, price: number) {
  const { data: event } = await supabase.from('events').select('title').eq('id', eventId).single()
  const { data: ticket } = await supabase.from('tickets').insert({
    event_id: eventId,
    user_id: userId,
    status: 'sold',
    price,
    currency: 'ZMW',
    payment_id: paymentId,
    purchased_at: new Date().toISOString(),
  }).select().single()

  if (ticket) {
    const qrData = JSON.stringify({ ticket_id: ticket.id, event_id: eventId, ticket_number: ticket.ticket_number })
    await supabase.from('tickets').update({ qr_code: `data:text/plain;base64,${btoa(qrData)}` }).eq('id', ticket.id)
    await supabase.rpc('increment', { table_name: 'events', row_id: eventId, column_name: 'tickets_sold' })
  }

  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'ticket_purchased',
    title: 'Ticket Purchased!',
    message: `Your ticket for ${event?.title || 'the event'} has been confirmed.`,
    data: { event_id: eventId, ticket_id: ticket?.id },
  })
}

async function updateOrderStatus(supabase: any, orderId: string, paymentId: string) {
  await supabase.from('orders').update({ status: 'paid', payment_id: paymentId }).eq('id', orderId)
  const { data: orderItems } = await supabase.from('order_items').select('merchandise_id, quantity').eq('order_id', orderId)
  if (orderItems) {
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        await supabase.rpc('increment', { table_name: 'merchandise', row_id: item.merchandise_id, column_name: 'sold_count' })
      }
    }
  }
  const { data: order } = await supabase.from('orders').select('user_id').eq('id', orderId).single()
  if (order) {
    await supabase.from('notifications').insert({
      user_id: order.user_id,
      type: 'purchase_complete',
      title: 'Order Confirmed!',
      message: 'Your order has been placed and is being processed.',
      data: { order_id: orderId },
    })
  }
}
