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

    const { data: settingRow } = await supabase.from('app_settings').select('value').eq('key', 'jamendo_client_id').single()
    const clientId = settingRow?.value?.replace(/"/g, '') || Deno.env.get('JAMENDO_CLIENT_ID') || ''

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'Jamendo client ID not configured' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const url = new URL(req.url)
    const genre = url.searchParams.get('genre') || ''
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const order = url.searchParams.get('order') || 'popularity_total'

    const jamendoUrl = new URL('https://api.jamendo.com/v3.0/tracks')
    jamendoUrl.searchParams.set('client_id', clientId)
    jamendoUrl.searchParams.set('format', 'json')
    jamendoUrl.searchParams.set('limit', limit.toString())
    jamendoUrl.searchParams.set('order', order)
    jamendoUrl.searchParams.set('audioformat', 'mp32')
    jamendoUrl.searchParams.set('include', 'musicinfo')
    if (genre) jamendoUrl.searchParams.set('tags', genre)

    const res = await fetch(jamendoUrl.toString())
    if (!res.ok) throw new Error(`Jamendo API error: ${res.status}`)

    const data = await res.json()
    const tracks = data.results || []

    const rows = tracks.map((t: any) => ({
      external_id: t.id.toString(),
      title: t.name,
      artist: t.artist_name,
      album: t.album_name,
      cover: t.album_image,
      audio_url: t.audio,
      genre: t.musicinfo?.tags?.genres?.[0] || genre || 'Other',
      source: 'jamendo',
      duration: t.duration,
    }))

    if (rows.length > 0) {
      const { error } = await supabase
        .from('external_music')
        .upsert(rows, { onConflict: 'external_id,source', ignoreDuplicates: false })
      if (error) throw error
    }

    return new Response(
      JSON.stringify({ success: true, synced: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('sync-jamendo error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
