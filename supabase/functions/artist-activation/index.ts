import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const PLAN_CONFIG: Record<string, { days: number; uploadLimit: number | null; label: string }> = {
  single: { days: 36500, uploadLimit: 1,    label: 'Single Upload (K10)' },
  weekly: { days: 7,     uploadLimit: null, label: 'Weekly Unlimited (K100)' },
  annual: { days: 365,   uploadLimit: null, label: 'Annual Pro (K500)' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { payment_id, user_id, plan } = await req.json()
    if (!payment_id || !user_id || !plan) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const config = PLAN_CONFIG[plan]
    if (!config) return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const now = new Date()
    const expiresAt = new Date(now.getTime() + config.days * 24 * 60 * 60 * 1000)

    // Deactivate previous plans
    await supabase.from('artist_plan_purchases').update({ active: false }).eq('user_id', user_id).eq('active', true)

    // Create new plan purchase
    await supabase.from('artist_plan_purchases').insert({
      user_id,
      plan,
      payment_id,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      active: true,
    })

    // Promote user to artist role ONLY if not already admin
    const { data: existingProfile } = await supabase.from('profiles').select('full_name, username, role').eq('id', user_id).single()
    if (existingProfile?.role !== 'admin') {
      await supabase.from('profiles').update({ role: 'artist' }).eq('id', user_id)
    }
    const profile = existingProfile
    await supabase.from('artists').upsert({
      id: user_id,
      artist_name: profile?.full_name || profile?.username || 'Artist',
      plan,
      plan_started_at: now.toISOString(),
      plan_expires_at: expiresAt.toISOString(),
      upload_limit: config.uploadLimit,
      uploads_used: 0,
      active: true,
      updated_at: now.toISOString(),
    }, { onConflict: 'id' })

    // SUCCESS notification
    await supabase.from('notifications').insert({
      user_id,
      title: '🎵 Artist Plan Activated!',
      body: `Your ${config.label} plan is now active. Start uploading your music and videos!`,
      type: 'success',
      metadata: { plan, expires_at: expiresAt.toISOString() },
    })

    return new Response(
      JSON.stringify({ success: true, expires_at: expiresAt.toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // Send FAILED notification if we have user_id
    try {
      const body = await req.json().catch(() => ({}))
      const uid = body?.user_id
      if (uid) {
        const supabase2 = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
        await supabase2.from('notifications').insert({
          user_id: uid,
          title: '❌ Plan Activation Failed',
          body: 'Your artist plan could not be activated. Please contact support or try again.',
          type: 'error',
          metadata: {},
        })
      }
    } catch { /* best-effort */ }
    console.error('artist-activation error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
