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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const body = await req.json()
    const { amount, phone_number, content_type, content_id, description } = body

    if (!amount || !phone_number || !content_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        amount,
        currency: 'ZMW',
        content_type,
        content_id: content_id || null,
        status: 'pending',
        phone_number,
        metadata: { description },
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Get Lipila settings
    const { data: settingRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'lipila_api_key')
      .single()

    const lipilaApiKey = settingRow?.value?.replace(/"/g, '') || ''
    const lipilaApiUrl = 'https://lipila.net/api'

    // Call Lipila API
    let lipilaRef = null
    let paymentStatus = 'pending'

    if (lipilaApiKey) {
      try {
        const lipilaRes = await fetch(`${lipilaApiUrl}/request-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lipilaApiKey}`,
          },
          body: JSON.stringify({
            amount: amount.toString(),
            phone: phone_number,
            reference: payment.id,
            description: description || `ZedVevo - ${content_type}`,
          }),
        })

        if (lipilaRes.ok) {
          const lipilaData = await lipilaRes.json()
          lipilaRef = lipilaData.reference || lipilaData.transaction_id
        }
      } catch (e) {
        console.error('Lipila API error:', e)
      }
    } else {
      // Demo mode: simulate successful payment
      lipilaRef = `DEMO-${Date.now()}`
      paymentStatus = 'completed'
    }

    // Update payment with Lipila ref
    await supabase
      .from('payments')
      .update({ lipila_ref: lipilaRef, status: paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', payment.id)

    // If demo mode (no real key), fulfill immediately
    if (paymentStatus === 'completed') {
      await fulfillPayment(supabase, { ...payment, status: 'completed' }, user.id, content_type, content_id)
    }

    return new Response(
      JSON.stringify({ success: true, payment_id: payment.id, lipila_ref: lipilaRef, status: paymentStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('lipila-payment error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

async function fulfillPayment(supabase: any, payment: any, userId: string, contentType: string, contentId: string | null) {
  if (contentType === 'artist_plan' && contentId) {
    // artist-activation handled by separate function
    await supabase.functions.invoke('artist-activation', {
      body: { payment_id: payment.id, user_id: userId, plan: contentId },
    })
  } else if (contentType === 'ticket' && contentId) {
    await supabase.functions.invoke('generate-ticket', {
      body: { payment_id: payment.id, user_id: userId, event_id: contentId },
    })
  } else if (contentId) {
    // Create purchase record
    await supabase.from('purchases').insert({
      user_id: userId,
      content_type: contentType,
      content_id: contentId,
      payment_id: payment.id,
    })
    // Notify user
    await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Purchase Complete',
      body: `Your ${contentType} purchase was successful!`,
      type: 'success',
      metadata: { payment_id: payment.id, content_type: contentType, content_id: contentId },
    })
  }
}
