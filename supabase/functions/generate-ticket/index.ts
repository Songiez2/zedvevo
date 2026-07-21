import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { payment_id, user_id, event_id } = await req.json()
    if (!payment_id || !user_id || !event_id) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check event availability
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .single()

    if (!event) return new Response(JSON.stringify({ error: 'Event not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (event.sold_qty >= event.total_qty) return new Response(JSON.stringify({ error: 'Sold out' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Create ticket record (trigger sets ticket_number)
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        event_id,
        user_id,
        payment_id,
        status: 'active',
      })
      .select()
      .single()

    if (ticketError) throw ticketError

    // Generate QR data (encode ticket info as JSON string)
    const qrData = JSON.stringify({
      ticket_number: ticket.ticket_number,
      event_id,
      user_id,
      event_title: event.title,
      event_date: event.event_date,
      venue: event.venue,
    })

    // Update ticket with QR code data
    await supabase.from('tickets').update({ qr_code: qrData }).eq('id', ticket.id)

    // Increment sold qty
    await supabase.from('events').update({ sold_qty: event.sold_qty + 1 }).eq('id', event_id)

    // Create purchase record
    await supabase.from('purchases').insert({
      user_id,
      content_type: 'ticket',
      content_id: event_id,
      payment_id,
    }).onConflict('user_id,content_type,content_id').ignore()

    // Send notification
    await supabase.from('notifications').insert({
      user_id,
      title: 'Ticket Purchased!',
      body: `Your ticket for "${event.title}" is confirmed. Ticket #${ticket.ticket_number}`,
      type: 'success',
      metadata: { ticket_id: ticket.id, ticket_number: ticket.ticket_number, event_title: event.title },
    })

    return new Response(
      JSON.stringify({ success: true, ticket_id: ticket.id, ticket_number: ticket.ticket_number }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('generate-ticket error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
