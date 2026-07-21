export type UserRole = 'visitor' | 'user' | 'artist' | 'admin'
export type ArtistPlanType = 'single' | 'weekly' | 'annual'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type ContentType = 'song' | 'video' | 'ticket' | 'product' | 'artist_plan'

export interface Profile {
  id: string
  email: string | null
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  phone: string | null
  role: UserRole
  language: string
  notifications_enabled: boolean
  profile_public: boolean
  is_active?: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon: string | null
  sort_order: number
  created_at: string
}

export interface ExternalMusic {
  id: string
  external_id: string
  title: string
  artist: string
  album: string | null
  cover: string | null
  audio_url: string
  genre: string | null
  source: string
  duration: number | null
  plays: number
  downloads: number
  is_premium: boolean
  price: number | null
  created_at: string
}

export interface Artist {
  id: string
  artist_name: string
  cover_url: string | null
  genre: string | null
  location: string | null
  social_links: Record<string, string>
  verified: boolean
  followers: number
  plan: ArtistPlanType | null
  plan_started_at: string | null
  plan_expires_at: string | null
  upload_limit: number | null
  uploads_used: number
  active: boolean
  created_at: string
  updated_at: string
  profile?: Profile
}

export interface Album {
  id: string
  artist_id: string
  title: string
  description: string | null
  cover_url: string | null
  genre: string | null
  is_premium: boolean
  price: number | null
  published: boolean
  plays: number
  created_at: string
  updated_at: string
  artist?: Profile
  songs?: Song[]
}

export interface Song {
  id: string
  artist_id: string
  album_id: string | null
  title: string
  description: string | null
  cover_url: string | null
  audio_url: string
  genre: string | null
  duration: number | null
  is_premium: boolean
  price: number | null
  published: boolean
  plays: number
  downloads: number
  artist_display_name: string | null
  featured_artists: string[] | null
  producer: string | null
  created_at: string
  updated_at: string
  artist?: Profile
  album?: Album
}

export interface Video {
  id: string
  artist_id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  video_url: string
  genre: string | null
  duration: number | null
  is_premium: boolean
  price: number | null
  published: boolean
  plays: number
  downloads: number
  created_at: string
  updated_at: string
  artist?: Profile
}

export interface Product {
  id: string
  artist_id?: string
  title: string
  description: string | null
  price: number
  images: string[]
  category: string
  stock: number
  published: boolean
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  artist_id?: string
  title: string
  description: string | null
  banner_url: string | null
  venue: string
  event_date: string
  ticket_price: number
  capacity?: number | null
  total_qty: number
  sold_qty: number
  published: boolean
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  event_id: string
  user_id: string
  payment_id: string | null
  qr_code: string | null
  ticket_number: string
  status: string
  created_at: string
  event?: Event
}

export interface Payment {
  id: string
  user_id: string
  amount: number
  currency: string
  content_type: ContentType
  content_id: string | null
  status: PaymentStatus
  lipila_ref: string | null
  phone_number: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Purchase {
  id: string
  user_id: string
  content_type: ContentType
  content_id: string
  payment_id: string | null
  created_at: string
}

export interface ArtistPlanPurchase {
  id: string
  user_id: string
  plan: ArtistPlanType
  payment_id: string | null
  started_at: string
  expires_at: string
  active: boolean
  created_at: string
}

export interface Playlist {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_url: string | null
  public: boolean
  created_at: string
  updated_at: string
  songs?: ExternalMusic[]
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

export interface Comment {
  id: string
  user_id: string
  content_type: ContentType
  content_id: string
  body: string
  created_at: string
  profile?: Profile
}

export interface AppSetting {
  key: string
  value: unknown
  updated_at: string
}

export const ARTIST_PLANS: Record<ArtistPlanType, {
  label: string; price: number; uploadLimit: number | null; days: number
  description: string; features: string[]
}> = {
  single: {
    label: 'Single Upload',
    price: 10,
    uploadLimit: 1,
    days: 365,
    description: 'Upload one song or music video',
    features: [
      'Upload 1 song OR 1 music video',
      'Video thumbnail required',
      'Permanent listing on ZedVevo',
      'Fan streaming & discovery',
    ],
  },
  weekly: {
    label: 'Weekly',
    price: 100,
    uploadLimit: null,
    days: 7,
    description: 'Unlimited music & video uploads for 7 days',
    features: [
      'Unlimited song uploads',
      'Unlimited music video uploads',
      'Video thumbnail support',
      'Fan streaming & discovery',
      'Valid for 7 days',
    ],
  },
  annual: {
    label: 'Annual',
    price: 500,
    uploadLimit: null,
    days: 365,
    description: 'Everything — unlimited uploads, sales & monetisation',
    features: [
      'Unlimited song & video uploads',
      'Sell music (set your own price)',
      'Sell event tickets',
      'Sell clothes & merchandise — unlimited',
      'Get paid for 10 million views milestone',
      'Priority placement in discovery',
      'Valid for 365 days',
    ],
  },
}

export const PRODUCT_CATEGORIES = ['Clothes', 'Shoes', 'Caps', 'Merchandise', 'Accessories']
