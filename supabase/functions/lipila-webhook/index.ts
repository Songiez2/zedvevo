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

    const body = await req.json()
    const { reference, status, transaction_id } = body

    if (!reference) {
      return new Response(JSON.stringify({ error: 'Missing reference' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Find payment by ID (reference is our payment.id)
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', reference)
      .single()

    if (error || !payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const newStatus = status === 'SUCCESS' || status === 'success' || status === 'completed' ? 'completed' : 'failed'

    await supabase
      .from('payments')
      .update({ status: newStatus, lipila_ref: transaction_id || payment.lipila_ref, updated_at: new Date().toISOString() })
      .eq('id', payment.id)

    if (newStatus === 'completed') {
      const { content_type, content_id, user_id } = payment

      if (content_type === 'artist_plan' && content_id) {
        await supabase.functions.invoke('artist-activation', {
          body: { payment_id: payment.id, user_id, plan: content_id },
        })
      } else if (content_type === 'ticket' && content_id) {
        await supabase.functions.invoke('generate-ticket', {
          body: { payment_id: payment.id, user_id, event_id: content_id },
        })
      } else if (content_id) {
        await supabase.from('purchases').insert({
          user_id,
          content_type,
          content_id,
          payment_id: payment.id,
        }).onConflict('user_id,content_type,content_id').ignore()

        await supabase.from('notifications').insert({
          user_id,
          title: 'Payment Successful',
          body: `Your ${content_type} purchase was successful!`,
          type: 'success',
          metadata: { payment_id: payment.id },
        })
      }
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('lipila-webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
