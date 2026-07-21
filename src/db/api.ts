import { supabase } from '@/lib/supabase'
import type { Profile, Song, Album, Video, Product, Event, Ticket, Payment, Purchase, Notification, Playlist, Comment, ExternalMusic, Artist, ArtistPlanPurchase, Category } from '@/types/types'

// ── XHR upload with progress ───────────────────────────────────────
async function uploadWithProgress(
  url: string,
  file: File,
  onProgress?: (pct: number) => void,
  upsert = false
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.setRequestHeader('x-upsert', upsert ? 'true' : 'false')
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        let msg = `Upload failed (${xhr.status})`
        try { msg = JSON.parse(xhr.responseText)?.error ?? msg } catch { /* */ }
        reject(new Error(msg))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.send(file)
  })
}

// ── Profiles ───────────────────────────────────────────────────────
export async function getProfile(id: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
  return data
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<void> {
  await supabase.from('profiles').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('profiles').upload(path, file, { upsert: true, contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('profiles').getPublicUrl(path)
  return data.publicUrl
}

export async function getAllProfiles(limit = 50, offset = 0): Promise<Profile[]> {
  const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

// ── Artists ────────────────────────────────────────────────────────
export async function getArtistProfile(id: string): Promise<Artist | null> {
  const { data } = await supabase.from('artists').select('*, profile:profiles(*)').eq('id', id).maybeSingle()
  return data
}

export async function getArtists(limit = 20, offset = 0): Promise<Artist[]> {
  const { data } = await supabase.from('artists').select('*, profile:profiles(id,username,full_name,avatar_url)').eq('active', true).order('followers', { ascending: false }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function updateArtistProfile(id: string, updates: Partial<Artist>): Promise<void> {
  await supabase.from('artists').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function uploadArtistImage(userId: string, file: File, type: 'avatar' | 'cover'): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${type}.${ext}`
  const { error } = await supabase.storage.from('artists').upload(path, file, { upsert: true, contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('artists').getPublicUrl(path)
  return data.publicUrl
}

export async function followArtist(followerId: string, artistId: string): Promise<void> {
  await supabase.from('followers').insert({ follower_id: followerId, artist_id: artistId })
  void supabase.rpc('increment_artist_followers', { artist_id: artistId })
}

export async function unfollowArtist(followerId: string, artistId: string): Promise<void> {
  await supabase.from('followers').delete().eq('follower_id', followerId).eq('artist_id', artistId)
}

export async function isFollowing(followerId: string, artistId: string): Promise<boolean> {
  const { data } = await supabase.from('followers').select('follower_id').eq('follower_id', followerId).eq('artist_id', artistId).maybeSingle()
  return !!data
}

// ── Songs (artist uploads) ─────────────────────────────────────────
export async function uploadSongFile(
  artistId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const path = `${artistId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
  // Use XHR for progress reporting
  await uploadWithProgress(
    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/music/${path}`,
    file,
    onProgress
  )
  const { data } = supabase.storage.from('music').getPublicUrl(path)
  return data.publicUrl
}

export async function getSignedAudioUrl(audioPath: string): Promise<string | null> {
  // If already a full URL (legacy), return as-is
  if (audioPath.startsWith('http')) return audioPath
  const { data, error } = await supabase.storage.from('music').createSignedUrl(audioPath, 3600)
  if (error) return null
  return data.signedUrl
}

export async function uploadCoverImage(
  bucket: string,
  artistId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `${artistId}/${Date.now()}.${ext}`
  await uploadWithProgress(
    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
    file,
    onProgress,
    true // upsert
  )
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export async function createSong(song: Omit<Song, 'id' | 'created_at' | 'updated_at' | 'plays' | 'downloads'>): Promise<Song | null> {
  const { data, error } = await supabase.from('songs').insert(song).select().maybeSingle()
  if (error) throw error
  // increment artist uploads_used (fire-and-forget — no rpc dependency)
  void (async () => {
    try {
      const { data: artist } = await supabase.from('artists').select('uploads_used').eq('id', song.artist_id).maybeSingle()
      if (artist) {
        await supabase.from('artists').update({ uploads_used: (artist.uploads_used ?? 0) + 1, updated_at: new Date().toISOString() }).eq('id', song.artist_id)
      }
    } catch { /* fire-and-forget */ }
  })()
  return data
}

export async function getArtistSongs(artistId: string): Promise<Song[]> {
  const { data } = await supabase.from('songs').select('*, album:albums(title,cover_url)').eq('artist_id', artistId).order('created_at', { ascending: false })
  return Array.isArray(data) ? data : []
}

export async function updateSong(id: string, updates: Partial<Song>): Promise<void> {
  await supabase.from('songs').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteSong(id: string): Promise<void> {
  await supabase.from('songs').delete().eq('id', id)
}

export async function getPublishedSongs(limit = 30, offset = 0, genre?: string): Promise<Song[]> {
  let q = supabase.from('songs').select('*, artist:profiles(id,username,full_name,avatar_url)').eq('published', true).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (genre) q = q.eq('genre', genre)
  const { data } = await q
  return Array.isArray(data) ? data : []
}

// ── Albums ─────────────────────────────────────────────────────────
export async function createAlbum(album: Omit<Album, 'id' | 'created_at' | 'updated_at' | 'plays'>): Promise<Album | null> {
  const { data, error } = await supabase.from('albums').insert(album).select().maybeSingle()
  if (error) throw error
  return data
}

export async function getArtistAlbums(artistId: string): Promise<Album[]> {
  const { data } = await supabase.from('albums').select('*, songs(id,title,duration,plays)').eq('artist_id', artistId).order('created_at', { ascending: false })
  return Array.isArray(data) ? data : []
}

export async function getPublishedAlbums(limit = 20, offset = 0): Promise<Album[]> {
  const { data } = await supabase.from('albums').select('*, artist:profiles(id,username,full_name,avatar_url), songs(id)').eq('published', true).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function updateAlbum(id: string, updates: Partial<Album>): Promise<void> {
  await supabase.from('albums').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteAlbum(id: string): Promise<void> {
  await supabase.from('albums').delete().eq('id', id)
}

// ── Videos ─────────────────────────────────────────────────────────
export async function uploadVideoFile(
  artistId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const path = `${artistId}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
  await uploadWithProgress(
    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/videos/${path}`,
    file,
    onProgress
  )
  const { data } = supabase.storage.from('videos').getPublicUrl(path)
  return data.publicUrl
}

export async function createVideo(video: Omit<Video, 'id' | 'created_at' | 'updated_at' | 'plays' | 'downloads'>): Promise<Video | null> {
  const { data, error } = await supabase.from('videos').insert(video).select().maybeSingle()
  if (error) throw error
  return data
}

export async function getArtistVideos(artistId: string): Promise<Video[]> {
  const { data } = await supabase.from('videos').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
  return Array.isArray(data) ? data : []
}

export async function getPublishedVideos(limit = 20, offset = 0): Promise<Video[]> {
  const { data } = await supabase.from('videos').select('*, artist:profiles(id,username,full_name,avatar_url)').eq('published', true).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function updateVideo(id: string, updates: Partial<Video>): Promise<void> {
  await supabase.from('videos').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteVideo(id: string): Promise<void> {
  await supabase.from('videos').delete().eq('id', id)
}

// ── External Music ─────────────────────────────────────────────────
export async function getExternalMusic(limit = 30, offset = 0, genre?: string): Promise<ExternalMusic[]> {
  let q = supabase.from('external_music').select('*').eq('source', 'jamendo').order('plays', { ascending: false }).range(offset, offset + limit - 1)
  if (genre) q = q.eq('genre', genre)
  const { data } = await q
  return Array.isArray(data) ? data : []
}

export async function searchExternalMusic(query: string, limit = 30): Promise<ExternalMusic[]> {
  const { data } = await supabase.from('external_music').select('*').or(`title.ilike.%${query}%,artist.ilike.%${query}%`).limit(limit)
  return Array.isArray(data) ? data : []
}

export async function incrementExternalPlays(id: string): Promise<void> {
  try { await supabase.rpc('increment_plays', { music_id: id }) } catch { /* ignore */ }
}

// ── Products ───────────────────────────────────────────────────────
export async function getProducts(limit = 20, offset = 0, category?: string): Promise<Product[]> {
  let q = supabase.from('products').select('*').eq('published', true).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (category) q = q.eq('category', category)
  const { data } = await q
  return Array.isArray(data) ? data : []
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
  return data
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product | null> {
  const { data, error } = await supabase.from('products').insert(product).select().maybeSingle()
  if (error) throw error
  return data
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<void> {
  await supabase.from('products').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteProduct(id: string): Promise<void> {
  await supabase.from('products').delete().eq('id', id)
}

export async function getAllProducts(limit = 50, offset = 0): Promise<Product[]> {
  const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function uploadProductImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `products/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('products').upload(path, file, { contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('products').getPublicUrl(path)
  return data.publicUrl
}

// ── Events ─────────────────────────────────────────────────────────
export async function getEvents(limit = 20, offset = 0): Promise<Event[]> {
  const { data } = await supabase.from('events').select('*').eq('published', true).order('event_date', { ascending: true }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function getEvent(id: string): Promise<Event | null> {
  const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
  return data
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'sold_qty'>): Promise<Event | null> {
  const { data, error } = await supabase.from('events').insert(event).select().maybeSingle()
  if (error) throw error
  return data
}

export async function updateEvent(id: string, updates: Partial<Event>): Promise<void> {
  await supabase.from('events').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteEvent(id: string): Promise<void> {
  await supabase.from('events').delete().eq('id', id)
}

export async function getAllEvents(limit = 50, offset = 0): Promise<Event[]> {
  const { data } = await supabase.from('events').select('*').order('event_date', { ascending: true }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function uploadEventBanner(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `banners/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('tickets').upload(path, file, { contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('tickets').getPublicUrl(path)
  return data.publicUrl
}

// ── Tickets ────────────────────────────────────────────────────────
export async function getUserTickets(userId: string): Promise<Ticket[]> {
  const { data } = await supabase.from('tickets').select('*, event:events(*)').eq('user_id', userId).order('created_at', { ascending: false })
  return Array.isArray(data) ? data : []
}

export async function getAllTickets(limit = 50, offset = 0): Promise<Ticket[]> {
  const { data } = await supabase.from('tickets').select('*, event:events(title,event_date,venue)').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

// ── Payments ───────────────────────────────────────────────────────
export async function initiatePayment(params: {
  amount: number
  phone_number: string
  content_type: string
  content_id?: string
  description?: string
}): Promise<{ success: boolean; payment_id?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('lipila-payment', { body: params })
  if (error) return { success: false, error: error.message }
  return data
}

export async function verifyPayment(paymentId: string): Promise<{ status: string; purchased: boolean }> {
  const { data, error } = await supabase.functions.invoke('verify-payment', { body: { payment_id: paymentId } })
  if (error) return { status: 'failed', purchased: false }
  return data ?? { status: 'failed', purchased: false }
}

export async function getUserPayments(userId: string, limit = 20, offset = 0): Promise<Payment[]> {
  const { data } = await supabase.from('payments').select('*').eq('user_id', userId).order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function getAllPayments(limit = 50, offset = 0): Promise<Payment[]> {
  const { data } = await supabase
    .from('payments')
    .select('*, profiles(id, full_name, username, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

// ── Purchases ──────────────────────────────────────────────────────
export async function hasPurchased(userId: string, contentType: string, contentId: string): Promise<boolean> {
  const { data } = await supabase.from('purchases').select('id').eq('user_id', userId).eq('content_type', contentType).eq('content_id', contentId).maybeSingle()
  return !!data
}

export async function getUserPurchases(userId: string): Promise<Purchase[]> {
  const { data } = await supabase.from('purchases').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  return Array.isArray(data) ? data : []
}

export async function getAllOrders(limit = 50, offset = 0): Promise<Purchase[]> {
  const { data } = await supabase
    .from('purchases')
    .select('*, profiles(id, email, username, full_name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

// ── Artist Plans ───────────────────────────────────────────────────
export async function getActivePlan(userId: string): Promise<ArtistPlanPurchase | null> {
  const { data } = await supabase.from('artist_plan_purchases').select('*').eq('user_id', userId).eq('active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data
}

export async function activateArtistPlan(paymentId: string, userId: string, plan: string): Promise<{ success: boolean; expires_at?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('artist-activation', {
    body: { payment_id: paymentId, user_id: userId, plan },
  })
  if (error) return { success: false, error: error.message }
  return data ?? { success: false, error: 'No response from activation service' }
}

export async function createNotification(userId: string, title: string, body: string, type = 'info', metadata?: Record<string, unknown>): Promise<void> {
  await supabase.from('notifications').insert({ user_id: userId, title, body, type, metadata })
}

// ── Playlists ──────────────────────────────────────────────────────
export async function getUserPlaylists(userId: string): Promise<Playlist[]> {
  const { data } = await supabase.from('playlists').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  return Array.isArray(data) ? data : []
}

export async function createPlaylist(userId: string, title: string, description?: string): Promise<Playlist | null> {
  const { data, error } = await supabase.from('playlists').insert({ user_id: userId, title, description }).select().maybeSingle()
  if (error) throw error
  return data
}

export async function deletePlaylist(id: string): Promise<void> {
  await supabase.from('playlists').delete().eq('id', id)
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  await supabase.from('playlist_songs').insert({ playlist_id: playlistId, song_id: songId })
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  await supabase.from('playlist_songs').delete().eq('playlist_id', playlistId).eq('song_id', songId)
}

export async function getPlaylistSongs(playlistId: string): Promise<ExternalMusic[]> {
  const { data } = await supabase.from('playlist_songs').select('external_music(*)').eq('playlist_id', playlistId).order('position', { ascending: true })
  return (data || []).map((r: Record<string, unknown>) => r.external_music as ExternalMusic).filter(Boolean)
}

// ── Likes ──────────────────────────────────────────────────────────
export async function likeSong(userId: string, songId: string): Promise<void> {
  await supabase.from('song_likes').insert({ user_id: userId, song_id: songId })
}

export async function unlikeSong(userId: string, songId: string): Promise<void> {
  await supabase.from('song_likes').delete().eq('user_id', userId).eq('song_id', songId)
}

export async function isSongLiked(userId: string, songId: string): Promise<boolean> {
  const { data } = await supabase.from('song_likes').select('user_id').eq('user_id', userId).eq('song_id', songId).maybeSingle()
  return !!data
}

export async function getLikedSongs(userId: string): Promise<ExternalMusic[]> {
  const { data } = await supabase.from('song_likes').select('external_music(*)').eq('user_id', userId).order('created_at', { ascending: false })
  return (data || []).map((r: Record<string, unknown>) => r.external_music as ExternalMusic).filter(Boolean)
}

// ── Comments ───────────────────────────────────────────────────────
export async function getComments(contentType: string, contentId: string): Promise<Comment[]> {
  const { data } = await supabase.from('comments').select('*, profile:profiles(username,full_name,avatar_url)').eq('content_type', contentType).eq('content_id', contentId).order('created_at', { ascending: true })
  return Array.isArray(data) ? data : []
}

export async function addComment(userId: string, contentType: string, contentId: string, body: string): Promise<Comment | null> {
  const { data, error } = await supabase.from('comments').insert({ user_id: userId, content_type: contentType, content_id: contentId, body }).select('*, profile:profiles(username,full_name,avatar_url)').maybeSingle()
  if (error) throw error
  return data
}

// ── Notifications ──────────────────────────────────────────────────
export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
  return Array.isArray(data) ? data : []
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
}

// ── App Settings ───────────────────────────────────────────────────
export async function getAppSettings(): Promise<Record<string, unknown>> {
  const { data } = await supabase.from('app_settings').select('*')
  const result: Record<string, unknown> = {}
  ;(data || []).forEach((r: { key: string; value: unknown }) => { result[r.key] = r.value })
  return result
}

export async function updateAppSetting(key: string, value: unknown): Promise<void> {
  await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() })
}

// ── Search ─────────────────────────────────────────────────────────
export async function globalSearch(query: string) {
  const [music, videos, products, events] = await Promise.all([
    supabase.from('external_music').select('*').or(`title.ilike.%${query}%,artist.ilike.%${query}%`).limit(10),
    supabase.from('videos').select('*').eq('published', true).or(`title.ilike.%${query}%`).limit(10),
    supabase.from('products').select('*').eq('published', true).or(`title.ilike.%${query}%`).limit(10),
    supabase.from('events').select('*').eq('published', true).or(`title.ilike.%${query}%,venue.ilike.%${query}%`).limit(10),
  ])
  return {
    music: Array.isArray(music.data) ? music.data : [],
    videos: Array.isArray(videos.data) ? videos.data : [],
    products: Array.isArray(products.data) ? products.data : [],
    events: Array.isArray(events.data) ? events.data : [],
  }
}

// ── Admin Stats ────────────────────────────────────────────────────
export async function getAdminStats() {
  const [users, artists, songs, videos, orders, tickets, streamsData, downloadsData] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('artists').select('id', { count: 'exact', head: true }),
    supabase.from('songs').select('id', { count: 'exact', head: true }),
    supabase.from('videos').select('id', { count: 'exact', head: true }),
    supabase.from('purchases').select('id', { count: 'exact', head: true }),
    supabase.from('tickets').select('id', { count: 'exact', head: true }),
    supabase.from('songs').select('plays'),
    supabase.from('songs').select('downloads'),
  ])
  const totalStreams = (streamsData.data || []).reduce((sum: number, r: { plays: number }) => sum + (r.plays || 0), 0)
  const totalDownloads = (downloadsData.data || []).reduce((sum: number, r: { downloads: number }) => sum + (r.downloads || 0), 0)
  return {
    totalUsers: users.count || 0,
    totalArtists: artists.count || 0,
    totalSongs: songs.count || 0,
    totalVideos: videos.count || 0,
    totalOrders: orders.count || 0,
    totalTickets: tickets.count || 0,
    totalStreams,
    totalDownloads,
    totalPayments: orders.count || 0,
    totalAlbums: 0,
  }
}

// ── Admin User Management ──────────────────────────────────────────
export async function getAllUsers(limit = 100, offset = 0): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function updateUserRole(id: string, role: string): Promise<void> {
  await supabase.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<void> {
  await supabase.from('profiles').update({ is_active: isActive, updated_at: new Date().toISOString() }).eq('id', id)
}

// ── Admin Artist Management ────────────────────────────────────────
export async function getAllArtists(limit = 100, offset = 0): Promise<Artist[]> {
  const { data } = await supabase
    .from('artists')
    .select('*, profiles(id, email, full_name, username, avatar_url)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

// ── Admin Content Management ───────────────────────────────────────
export async function getAllSongsAdmin(limit = 100, offset = 0): Promise<Song[]> {
  const { data } = await supabase
    .from('songs')
    .select('*, profiles(id, full_name, username, avatar_url)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function getAllVideosAdmin(limit = 100, offset = 0): Promise<Video[]> {
  const { data } = await supabase
    .from('videos')
    .select('*, profiles(id, full_name, username, avatar_url)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function getAllAlbumsAdmin(limit = 100, offset = 0): Promise<Album[]> {
  const { data } = await supabase
    .from('albums')
    .select('*, profiles(id, full_name, username, avatar_url), songs(id)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function deleteAlbumAdmin(id: string): Promise<void> {
  await supabase.from('albums').delete().eq('id', id)
}

// ── Admin Reports ──────────────────────────────────────────────────
export async function getTopSongs(limit = 10): Promise<Song[]> {
  const { data } = await supabase
    .from('songs')
    .select('*, profiles(id, full_name, username)')
    .eq('published', true)
    .order('plays', { ascending: false })
    .limit(limit)
  return Array.isArray(data) ? data : []
}

export async function getTopArtists(limit = 10): Promise<Artist[]> {
  const { data } = await supabase
    .from('artists')
    .select('*, profiles(id, full_name, username, avatar_url)')
    .order('followers', { ascending: false })
    .limit(limit)
  return Array.isArray(data) ? data : []
}

// ── Admin Settings (bulk) ──────────────────────────────────────────
export async function updateAppSettings(settings: Record<string, string>): Promise<void> {
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))
  await supabase.from('app_settings').upsert(rows, { onConflict: 'key' })
}

export async function syncJamendo(): Promise<{ count: number }> {
  const { data, error } = await supabase.functions.invoke('sync-jamendo', { body: {} })
  if (error) throw new Error(error.message)
  return data || { count: 0 }
}

// ── Categories ─────────────────────────────────────────────────────
export async function getCategories(): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
  return Array.isArray(data) ? data : []
}

export async function createCategory(cat: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
  const { data, error } = await supabase.from('categories').insert(cat).select().maybeSingle()
  if (error) throw error
  return data
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<void> {
  await supabase.from('categories').update(updates).eq('id', id)
}

export async function deleteCategory(id: string): Promise<void> {
  await supabase.from('categories').delete().eq('id', id)
}

// ── Notifications Admin ────────────────────────────────────────────
export async function getAllNotifications(limit = 100, offset = 0): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*, profiles(id, username, full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  return Array.isArray(data) ? data : []
}

export async function sendBroadcastNotification(title: string, body: string, type = 'info'): Promise<void> {
  const { data: users } = await supabase.from('profiles').select('id').neq('role', 'visitor')
  if (!Array.isArray(users)) return
  const rows = users.map(u => ({ user_id: u.id, title, body, type, metadata: {} }))
  await supabase.from('notifications').insert(rows)
}

/** Sends an 'update' notification to all artists (used by admin for system announcements) */
export async function sendArtistUpdateNotification(title: string, body: string): Promise<void> {
  const { data: artists } = await supabase.from('profiles').select('id').eq('role', 'artist')
  if (!Array.isArray(artists)) return
  const rows = artists.map(u => ({ user_id: u.id, title, body, type: 'update', metadata: {} }))
  if (rows.length) await supabase.from('notifications').insert(rows)
}

export async function deleteNotification(id: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', id)
}

export async function deleteAllNotifications(): Promise<void> {
  await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

// ── Hero Slides ────────────────────────────────────────────────────
export interface HeroSlide {
  id: string; title: string; subtitle: string | null; image_url: string | null
  link_url: string | null; link_label: string | null; sort_order: number
  active: boolean; created_at: string; updated_at: string
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  const { data } = await supabase
    .from('hero_slides')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  return Array.isArray(data) ? data : []
}

export async function createHeroSlide(slide: Omit<HeroSlide, 'id' | 'created_at' | 'updated_at'>): Promise<HeroSlide | null> {
  const { data, error } = await supabase.from('hero_slides').insert(slide).select().maybeSingle()
  if (error) throw error
  return data
}

export async function updateHeroSlide(id: string, updates: Partial<HeroSlide>): Promise<void> {
  await supabase.from('hero_slides').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteHeroSlide(id: string): Promise<void> {
  await supabase.from('hero_slides').delete().eq('id', id)
}

export async function uploadHeroImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `hero/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true, contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('images').getPublicUrl(path)
  return data.publicUrl
}

// ── Featured Content ──────────────────────────────────────────────
export interface FeaturedContent {
  id: string; section: string; content_id: string; sort_order: number; active: boolean; created_at: string
}

export async function getFeaturedContent(section?: string): Promise<FeaturedContent[]> {
  let q = supabase.from('featured_content').select('*').order('sort_order', { ascending: true })
  if (section) q = q.eq('section', section)
  const { data } = await q
  return Array.isArray(data) ? data : []
}

export async function addFeaturedContent(section: string, contentId: string): Promise<void> {
  await supabase.from('featured_content').insert({ section, content_id: contentId })
}

export async function removeFeaturedContent(id: string): Promise<void> {
  await supabase.from('featured_content').delete().eq('id', id)
}

// ── Advertisements ────────────────────────────────────────────────
export interface Advertisement {
  id: string; title: string; image_url: string | null; link_url: string | null
  placement: string; active: boolean; impressions: number; clicks: number
  starts_at: string | null; ends_at: string | null; created_at: string; updated_at: string
}

export async function getAdvertisements(all = false): Promise<Advertisement[]> {
  let q = supabase.from('advertisements').select('*').order('created_at', { ascending: false })
  if (!all) q = q.eq('active', true)
  const { data } = await q
  return Array.isArray(data) ? data : []
}

export async function createAdvertisement(ad: Omit<Advertisement, 'id' | 'created_at' | 'updated_at' | 'impressions' | 'clicks'>): Promise<Advertisement | null> {
  const { data, error } = await supabase.from('advertisements').insert(ad).select().maybeSingle()
  if (error) throw error
  return data
}

export async function updateAdvertisement(id: string, updates: Partial<Advertisement>): Promise<void> {
  await supabase.from('advertisements').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteAdvertisement(id: string): Promise<void> {
  await supabase.from('advertisements').delete().eq('id', id)
}

export async function uploadAdImage(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `ads/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true, contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('images').getPublicUrl(path)
  return data.publicUrl
}

// ── Donations ─────────────────────────────────────────────────────
export interface Donation {
  id: string; donor_id: string | null; donor_name: string | null; donor_phone: string
  amount: number; message: string | null; payment_id: string | null
  status: 'pending' | 'completed' | 'failed'; created_at: string; updated_at: string
}

export async function createDonation(params: {
  donor_id?: string; donor_name?: string; donor_phone: string; amount: number; message?: string
}): Promise<{ success: boolean; donation_id?: string; error?: string }> {
  const result = await initiatePayment({
    amount: params.amount,
    phone_number: params.donor_phone,
    content_type: 'donation',
    description: `Donation to ZedVevo${params.message ? `: ${params.message}` : ''}`,
  })
  if (!result.success) return { success: false, error: result.error }
  const { data, error } = await supabase.from('donations').insert({
    donor_id: params.donor_id ?? null,
    donor_name: params.donor_name ?? null,
    donor_phone: params.donor_phone,
    amount: params.amount,
    message: params.message ?? null,
    payment_id: result.payment_id ?? null,
    status: 'pending',
  }).select('id').maybeSingle()
  if (error) return { success: false, error: error.message }
  return { success: true, donation_id: data?.id }
}

export async function getArtistProducts(artistId: string): Promise<Product[]> {
  const { data } = await supabase.from('products').select('*').eq('artist_id', artistId).order('created_at', { ascending: false })
  return Array.isArray(data) ? data : []
}

export async function getArtistEvents(artistId: string): Promise<Event[]> {
  const { data } = await supabase.from('events').select('*').eq('artist_id', artistId).order('event_date', { ascending: true })
  return Array.isArray(data) ? data : []
}

// ── Sponsors ──────────────────────────────────────────────────────
export interface Sponsor {
  id: string; name: string; logo_url: string | null; website_url: string | null
  tier: string; sort_order: number; active: boolean; created_at: string; updated_at: string
}

export async function getSponsors(all = false): Promise<Sponsor[]> {
  let q = supabase.from('sponsors').select('*').order('sort_order', { ascending: true })
  if (!all) q = q.eq('active', true)
  const { data } = await q
  return Array.isArray(data) ? data : []
}

export async function createSponsor(s: Omit<Sponsor, 'id' | 'created_at' | 'updated_at'>): Promise<Sponsor | null> {
  const { data, error } = await supabase.from('sponsors').insert(s).select().maybeSingle()
  if (error) throw error
  return data
}

export async function updateSponsor(id: string, updates: Partial<Sponsor>): Promise<void> {
  await supabase.from('sponsors').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function deleteSponsor(id: string): Promise<void> {
  await supabase.from('sponsors').delete().eq('id', id)
}

export async function uploadSponsorLogo(file: File): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const path = `sponsors/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('images').upload(path, file, { upsert: true, contentType: file.type })
  if (error) return null
  const { data } = supabase.storage.from('images').getPublicUrl(path)
  return data.publicUrl
}

// ── Audit Logs ────────────────────────────────────────────────────
export interface AuditLog {
  id: string; actor_id: string | null; actor_email: string | null; action: string
  resource: string; resource_id: string | null; details: Record<string, unknown>
  ip_address: string | null; created_at: string
}

export async function getAuditLogs(limit = 100, offset = 0, resource?: string): Promise<AuditLog[]> {
  let q = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (resource) q = q.eq('resource', resource)
  const { data } = await q
  return Array.isArray(data) ? data : []
}

export async function writeAuditLog(actorId: string, actorEmail: string, action: string, resource: string, resourceId?: string, details?: Record<string, unknown>): Promise<void> {
  await supabase.from('audit_logs').insert({ actor_id: actorId, actor_email: actorEmail, action, resource, resource_id: resourceId ?? null, details: details ?? {} })
}

// ── Storage stats (admin) ─────────────────────────────────────────
export async function getStorageStats(): Promise<{ bucket: string; count: number; size: number }[]> {
  const buckets = ['music', 'videos', 'artists', 'profiles', 'products', 'tickets', 'images']
  const results = await Promise.all(
    buckets.map(async bucket => {
      const { data } = await supabase.storage.from(bucket).list('', { limit: 1000 })
      const count = data?.length ?? 0
      const size = data?.reduce((acc, f) => acc + (f.metadata?.size ?? 0), 0) ?? 0
      return { bucket, count, size }
    })
  )
  return results
}

// ── Admin — update/delete user ────────────────────────────────────
export async function adminDeleteUser(id: string): Promise<void> {
  await supabase.from('profiles').delete().eq('id', id)
}

// ── Admin — Categories (all) ──────────────────────────────────────
export async function getAllCategories(): Promise<Category[]> {
  const { data } = await supabase.from('categories').select('*').order('sort_order', { ascending: true })
  return Array.isArray(data) ? data : []
}
