# Requirements Document

## 1. Application Overview

**Application Name**: ZedVevo

**Description**: A Zambia-focused digital entertainment platform providing music streaming (via Jamendo API integration), video sharing, artist monetization, event ticketing, and merchandise marketplace. The platform is a complete production-ready full-stack web application with automatic payment processing via Lipila API.

**Technology Stack**:
- Frontend: React + Vite + TypeScript + Tailwind CSS + React Router + Zustand + React Query + Framer Motion
- Backend: Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions, Row Level Security)
- Payments: Lipila API with webhooks and automatic verification
- Music API: Jamendo API integration (legal music source)
- Deployment: Vercel-ready

**Design Aesthetic**: Minimal design with airiness, whitespace, clear information hierarchy through font size/weight/spacing, minimal shadows or decorative colors, gentle contrast, fine non-sharp typefaces. Dark and electric blue color scheme.

**Supabase Configuration**:
- URL: https://lxhjyaklgnlrvojjyeps.supabase.co
- Publishable key: sb_publishable_Vqagga7aYeCcW5nRwpZrmw_ZWnthoU5

**Initial State**: Database starts clean with no demo data or fake content. Display \"No content available yet\" when empty.

## 2. Users and Usage Scenarios

**User Roles**:
- **Visitor**: Browse, search, stream free music/video, view products/events without account
- **User**: Stream free content, purchase premium content, download purchased items, buy tickets/products, like, comment, create playlists, receive notifications
- **Artist**: Upload songs/albums/videos after purchasing artist plan (cannot create products or tickets)
- **Admin**: Full access to all platform modules and settings. First registered Supabase user automatically becomes admin (only one admin exists)

**Core Usage Scenarios**:
- Visitors explore platform content without registration
- Users register, purchase content, manage library and playlists
- Artists purchase plans via Lipila payment, upload content, track analytics
- Admin manages all platform content, users, payments, settings, creates products and events

## 3. Page Structure and Functionality

### 3.1 Page Structure

```
ZedVevo Application
├── Public Pages (No Auth Required)
│   ├── Home Page
│   ├── Music Page
│   ├── Videos Page
│   ├── Store Page
│   ├── Events Page
│   ├── Search Page
│   ├── Song Detail Page
│   ├── Album Detail Page
│   ├── Video Detail Page
│   ├── Product Detail Page
│   └── Event Detail Page
├── Authentication Pages
│   ├── Registration Page
│   ├── Login Page
│   └── Password Reset Page
├── User Pages (Auth Required)
│   ├── My Library
│   ├── Playlists
│   ├── Purchases
│   ├── Downloads
│   ├── Favorites
│   ├── Notifications
│   └── Profile Settings
├── Artist Dashboard (Artist Role Required)
│   ├── Upload Song
│   ├── Upload Album
│   ├── Upload Video
│   ├── My Songs
│   ├── My Albums
│   ├── My Videos
│   ├── Analytics
│   ├── Subscription Management
│   └── Artist Profile Settings
└── Admin Dashboard (Admin Role Required)
    ├── Users Management
    ├── Artists Management
    ├── Songs Management
    ├── Albums Management
    ├── Videos Management
    ├── Products Management
    ├── Tickets Management
    ├── Orders Management
    ├── Payments Management
    ├── Settings
    ├── Reports
    └── Analytics
```

### 3.2 Authentication Pages

**Registration Page**:
- Input: email, password, username
- Optional: upload profile photo
- Submit registration
- First registered Supabase user automatically becomes admin

**Login Page**:
- Input: email, password
- Login button
- Link to password reset

**Password Reset Page**:
- Input: email
- Receive reset link
- Set new password

### 3.3 Home Page

**Content Sections**:
- Featured Songs
- Trending Songs (from Jamendo API)
- New Releases (from Jamendo API)
- Popular Videos
- Featured Artists
- Categories
- Featured Products
- Upcoming Events

### 3.4 Music Page

**Music Library Display**:
- Display songs from Jamendo API integration
- Songs cached in Supabase table: external_music (id, external_id, title, artist, album, cover, audio_url, genre, source, created_at)
- Free songs: all users can stream
- Premium songs: visitors preview only, users must purchase to access full content
- Filter by categories
- Sort by trending, new releases

**Music Player**:
- Full player controls: play, pause, next, previous, seek, volume, shuffle, repeat
- Queue management
- Mini-player mode

**User Actions**:
- Stream music
- Purchase premium songs (Lipila payment)
- Download purchased songs (registered users only)
- Like songs
- Add to playlists
- Comment on songs

### 3.5 Videos Page

**Video Library Display**:
- Display all videos (MP4 format only)
- Filter by categories

**Video Player**:
- Stream videos
- Fullscreen mode

**User Actions**:
- Stream videos
- Purchase premium videos (Lipila payment)
- Download purchased videos
- Like videos
- Comment on videos

### 3.6 Store Page

**Product Display**:
- Display products created by admin only
- Categories: Clothes, Shoes, Caps, Merchandise, Accessories
- Filter by categories
- Search products

**Product Detail Page**:
- Display product images, title, description, price
- Purchase button (Lipila payment)

### 3.7 Events Page

**Event Display**:
- Display events created by admin only
- Show event banner, name, venue, date, time, price, quantity

**Event Detail Page**:
- Display event details
- Purchase ticket button (Lipila payment)
- After purchase: auto-generate QR code, create digital ticket, send notification

### 3.8 My Library Page

**Library Sections**:
- Purchases: all purchased content
- Downloads: all downloaded content
- Playlists: user-created playlists
- Favorites: liked songs and videos

### 3.9 User Profile Settings

**Profile Information**:
- Edit: full name, username, photo, bio, phone
- Change password
- Change email
- Delete account

**Preferences**:
- Theme settings
- Notification settings
- Privacy settings
- Language preferences

### 3.10 Artist Dashboard

**Upload Content**:
- Upload Song: audio file, title, artist name, genre, description, cover image, set price or free
- Upload Album: cover image, album title, description, genre, add multiple songs, set price or free
- Upload Video: MP4 file, title, description, genre, thumbnail, set price or free
- Upload enabled only when artist plan is active

**Manage Content**:
- My Songs: view, edit, delete own songs
- My Albums: view, edit, delete own albums
- My Videos: view, edit, delete own videos

**Analytics**:
- View streams count
- View downloads count
- View followers count

**Subscription Management**:
- View current plan status
- View plan expiration date
- Purchase new plan

**Artist Profile Settings**:
- Edit: artist name, photo, cover image, bio, genre, location
- Add social media links

### 3.11 Admin Dashboard

**Users Management**:
- View all users
- Manage user roles and permissions

**Artists Management**:
- View all artists
- View artist plans and expiration dates

**Content Management**:
- Songs: view, edit, delete all songs
- Albums: view, edit, delete all albums
- Videos: view, edit, delete all videos

**Products Management**:
- Create products (admin only)
- Edit products
- Delete products
- Manage product categories: Clothes, Shoes, Caps, Merchandise, Accessories

**Tickets Management**:
- Create events and tickets (admin only)
- Edit events
- Delete events
- Manage ticket sales

**Orders Management**:
- View all orders
- Track order status

**Payments Management**:
- View all payment transactions
- View payment history

**Settings**:
- App Settings: app name, logo, theme
- User Roles and Permissions
- Content Categories
- Featured Content
- Advertisements
- Lipila Settings: configure Lipila API integration
- API Settings
- Storage Settings
- Security Settings

**Reports and Analytics**:
- Total users count
- Total artists count
- Total songs count
- Total videos count
- Total downloads count
- Total streams count
- Total orders count
- No revenue tracking

## 4. Business Rules and Logic

### 4.1 User Roles and Permissions

**Admin**:
- First registered Supabase user automatically becomes admin
- Only one admin exists
- Full access to all platform features
- Only admin can create products and events

**Artist**:
- User becomes artist after purchasing artist plan via Lipila payment
- Artist role activates automatically after successful payment
- Can upload songs, albums, videos only when plan is active
- Cannot create products or tickets
- Plan auto-expires: uploads disabled when plan expires

**User**:
- Can stream free content
- Can purchase premium content via Lipila payment
- Can download purchased content (registered users only)
- Can create playlists, like, comment

**Visitor**:
- Can browse all pages
- Can search content
- Can stream free music and videos
- Can preview premium content (limited access)
- Cannot purchase, download, or interact (like, comment, playlist)

### 4.2 Artist Plans

**Plan Types**:
- DAILY Plan: K20, 1 song upload limit, 24 hours duration
- WEEKLY Plan: K100, 8 songs upload limit, 7 days duration
- ANNUAL Plan: K500, unlimited uploads, 365 days duration

**Plan Activation Flow**:
1. User selects artist plan
2. User proceeds to Lipila payment
3. Payment success: artist role activates automatically, upload permissions granted
4. Payment failure: no role change, no upload access

**Plan Expiration**:
- System automatically disables upload permissions when plan expires
- Artist can renew plan via Lipila payment

### 4.3 Music System

**Jamendo API Integration**:
- Music API service located at src/services/musicApi.ts
- Functions: getSongs, getArtists, getAlbums, searchMusic, getTrendingSongs, getNewReleases
- Songs cached in Supabase table: external_music (id, external_id, title, artist, album, cover, audio_url, genre, source, created_at)

**Content Access Rules**:
- Free songs: all users (including visitors) can stream
- Premium songs: visitors preview only, users must purchase via Lipila payment to access full content

### 4.4 Payment System

**Lipila API Integration**:
- All payments processed via Lipila API
- Webhooks for automatic payment verification
- Edge Functions: lipila-payment, lipila-webhook, verify-payment

**Payment Flow**:
1. User initiates payment (content purchase, artist plan, ticket, product)
2. System calls Lipila API
3. User completes payment
4. Lipila webhook triggers automatic verification
5. Payment success: unlock content, activate role, generate ticket, complete order
6. Payment failure: display error, allow retry

### 4.5 Download System

**Download Rules**:
- Free downloads: available for registered users only
- Paid downloads: available only after purchase verification
- Visitors cannot download any content

### 4.6 Ticket System

**Ticket Creation** (admin only):
- Input: event name, banner, venue, date, time, price, quantity
- Submit event

**Ticket Purchase Flow**:
1. User clicks purchase button
2. User proceeds to Lipila payment
3. Payment success: auto-generate QR code, create digital ticket, send notification
4. Ticket appears in user library

**Edge Function**: generate-ticket

### 4.7 Marketplace System

**Product Creation** (admin only):
- Upload product images
- Input: title, description, price
- Select category: Clothes, Shoes, Caps, Merchandise, Accessories
- Submit product

**Product Purchase Flow**:
1. User clicks purchase button
2. User proceeds to Lipila payment
3. Payment success: order completes, send notification
4. Order appears in user library and admin orders management

### 4.8 Supabase Storage Buckets

**Storage Organization**:
- music: audio files
- videos: MP4 files
- albums: album covers
- profiles: user profile photos
- artists: artist photos and cover images
- products: product images
- tickets: event banners
- images: general images

### 4.9 Supabase Edge Functions

**Edge Functions**:
- lipila-payment: process Lipila payment requests
- lipila-webhook: handle Lipila payment webhooks
- verify-payment: verify payment status
- artist-activation: activate artist role after payment
- generate-ticket: generate QR code and digital ticket
- send-notification: send user notifications

### 4.10 Row Level Security (RLS)

**RLS Policies**:
- Visitors: read access to public content
- Users: manage own data (playlists, purchases, downloads, favorites)
- Artists: manage own uploads (songs, albums, videos)
- Admin: full access to all data

### 4.11 Artist Content Management

**Edit Content**:
- Artist can edit own songs, albums, videos
- Update: title, description, price, cover image, thumbnail

**Delete Content**:
- Artist can delete own songs, albums, videos
- Deletion removes content from platform
- Purchased content remains in user libraries

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| Payment fails during artist plan purchase | Display error message, no role change, allow retry |
| Payment fails during content purchase | Display error message, content remains locked, allow retry |
| Payment fails during ticket purchase | Display error message, no ticket generated, allow retry |
| Payment fails during product purchase | Display error message, order not created, allow retry |
| Artist plan expires | Automatically disable upload permissions, display expiration message |
| DAILY plan artist attempts to upload more than 1 song | Display error message indicating upload limit reached |
| WEEKLY plan artist attempts to upload more than 8 songs | Display error message indicating upload limit reached |
| User attempts to download without registration | Display message prompting registration |
| Visitor attempts to purchase content | Display message prompting registration |
| User attempts to purchase already purchased content | Display message indicating content already owned |
| Event ticket quantity reaches zero | Disable purchase button, display Sold Out message |
| User registers with existing email | Display error message indicating email already registered |
| First user registers | Automatically assign admin role |
| Second user attempts to become admin | Prevent admin role assignment, only one admin allowed |
| User forgets password | Provide password reset link via email |
| Jamendo API request fails | Display error message, retry request |
| Lipila webhook fails | Log error, retry webhook processing |
| Artist uploads non-MP4 video | Display error message, reject upload |
| Database is empty | Display \"No content available yet\" message |
| Artist attempts to create product | Display error message, only admin can create products |
| Artist attempts to create event | Display error message, only admin can create events |
| User attempts to access admin dashboard | Display access denied message |
| Artist attempts to upload when plan expired | Display error message, prompt plan renewal |

## 6. Acceptance Criteria

1. First user registers via Supabase Auth, account automatically becomes admin
2. Admin logs into admin dashboard, creates product with images and details, product appears in store
3. Visitor browses home page, views trending songs from Jamendo API, streams free song
4. User registers, logs in, purchases premium song via Lipila payment, payment succeeds, song unlocks and appears in library
5. User purchases WEEKLY artist plan (K100) via Lipila payment, payment succeeds, artist role activates immediately, upload permissions granted
6. Artist uploads song with audio file and cover image, song appears in artist dashboard and music library
7. Admin creates event with banner and details, event appears in events page
8. User purchases event ticket via Lipila payment, payment succeeds, QR code generates automatically, digital ticket appears in library, notification sent

## 7. Features Not Included in This Release

- Live streaming concerts or events
- Real-time chat between users
- User-to-user messaging system
- Social feed or activity timeline
- User reviews and ratings for content
- Collaborative playlists
- Lyrics display during playback
- Podcast hosting and streaming
- Subscription-based premium membership
- Referral or affiliate program
- Multi-language support beyond English
- Advanced audio equalizer settings
- Offline video downloads
- Push notifications for mobile apps
- Integration with external music services beyond Jamendo API
- Advanced analytics dashboard for artists (demographic data, geographic distribution)
- Automated content moderation
- User-generated radio stations
- Karaoke mode
- Concert or event live ticketing with seat selection
- Merchandise inventory management system
- Shipping and logistics integration for merchandise
- Refund and return processing
- Customer support ticketing system
- Advanced search filters (by mood, tempo, key)
- Personalized content recommendations based on listening history
- Integration with social media for automatic content posting
- Blockchain-based NFT marketplace for exclusive content
- Crowdfunding for artists
- Fan club or membership tiers for artists
- Revenue tracking in admin analytics
- Artist ability to create products or tickets