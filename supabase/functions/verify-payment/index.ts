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

    // Accept payment_id from POST body (replaces old GET query string)
    const body = await req.json().catch(() => ({}))
    const paymentId = body.payment_id as string | undefined

    if (!paymentId) return new Response(JSON.stringify({ error: 'Missing payment_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single()

    if (!payment) return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // If still pending, check with Lipila
    if (payment.status === 'pending' && payment.lipila_ref) {
      const { data: settingRow } = await supabase.from('app_settings').select('value').eq('key', 'lipila_api_key').single()
      const lipilaApiKey = (settingRow?.value as string)?.replace(/"/g, '') || ''

      if (lipilaApiKey && payment.lipila_ref) {
        try {
          const res = await fetch(`https://lipila.net/api/check-status/${payment.lipila_ref}`, {
            headers: { 'Authorization': `Bearer ${lipilaApiKey}` },
          })
          if (res.ok) {
            const data = await res.json()
            const newStatus = data.status === 'SUCCESS' ? 'completed' : data.status === 'FAILED' ? 'failed' : 'pending'
            if (newStatus !== 'pending') {
              await supabase.from('payments').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', paymentId)
              payment.status = newStatus
            }
          }
        } catch (e) { console.error('Lipila check error:', e) }
      }
    }

    // Check if purchase exists
    let purchased = false
    if (payment.content_id && payment.status === 'completed') {
      const { data: purchase } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_type', payment.content_type)
        .eq('content_id', payment.content_id)
        .maybeSingle()
      purchased = !!purchase
    }

    // For artist_plan, check artist_plan_purchases instead
    if (payment.content_type === 'artist_plan' && payment.status === 'completed') {
      const { data: planPurchase } = await supabase
        .from('artist_plan_purchases')
        .select('id')
        .eq('user_id', user.id)
        .eq('active', true)
        .maybeSingle()
      purchased = !!planPurchase
    }

    return new Response(
      JSON.stringify({ status: payment.status, purchased }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('verify-payment error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
