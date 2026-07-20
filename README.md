# ZedVevo - Music Streaming & Digital Marketplace

A production-ready Vite application for music streaming and digital marketplace, built with React 19, TypeScript, and Supabase.

## Features

### Authentication & Users
- User registration and login
- Password reset functionality
- Profile management with avatar upload
- Role-based access (User, Artist, Admin, Super Admin)
- **First registered user automatically becomes Super Admin**

### Music & Audio
- Stream music with full player controls
- Download free songs
- Purchase premium songs
- Like, share, and favorite songs
- Create and manage playlists
- Shuffle and repeat modes
- Background playback
- Mini player

### Videos
- Watch music videos
- Stream with quality selection
- Resume playback
- Download free videos
- Purchase premium videos
- Comment on videos

### Artist Features
- Artist subscription plans:
  - **Daily**: K20 - 1 Song, 1 Day
  - **Weekly**: K100 - 8 Songs, 7 Days
  - **Annual**: K500 - Unlimited Uploads, 1 Year
- Upload songs and albums
- Upload music videos
- Sell event tickets
- Sell merchandise
- Analytics dashboard
- Revenue tracking

### Mobile Money Payments (Lipila)
- **MTN Mobile Money support**
- **Airtel Money support**
- Phone number validation (Zambia format)
- Real-time payment verification
- Automatic account activation after successful payment
- **Payment failure handling** - users must retry if payment fails

### Store & Marketplace
- Browse merchandise by category
- Multiple images and variants (size, color)
- Shopping cart
- Checkout with Lipila payments
- Order tracking

### Events & Tickets
- Create events with QR code tickets
- Ticket purchase with payment
- Digital ticket generation

### Admin Dashboard
- **Super Admin has full access**
- Manage users, artists, songs, albums, videos
- Manage categories and hero slider
- View payments and orders
- Site settings management

## Tech Stack

### Frontend
- Vite + React 19 + TypeScript
- Tailwind CSS
- React Router DOM
- TanStack React Query
- Zustand (state management)
- Framer Motion (animations)
- React Hook Form + Zod (forms)
- Lucide React (icons)
- Radix UI (components)

### Backend
- Supabase Authentication
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions
- Row Level Security (RLS)

### Payments
- **Lipila API** for Mobile Money
- MTN and Airtel support
- Automatic payment verification
- Webhook processing
- Receipt generation

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account (https://supabase.com)
- Lipila account (for payments - https://lipila.com)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

4. Configure your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://lxhjyaklgnlrvojjyeps.supabase.co
   VITE_SUPABASE_ANON_KEY=VITE_SB_PUBLISHABLE_KEY
   ```

5. Configure Lipila credentials:
   ```
   VITE_LIPILA_API_KEY=your_lipila_api_key
   VITE_LIPILA_MERCHANT_ID=your_lipila_merchant_id
   VITE_LIPILA_SERVICE_ID=your_lipila_service_id
   ```

### Database Setup

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Run the main schema:
   - Copy and paste contents of `supabase/schema.sql`
   - Click "Run"

4. Run the super admin migration (optional):
   - Copy and paste contents of `supabase/migrations/001_super_admin.sql`

### Storage Buckets

Create these buckets in Supabase Storage:
- `avatars` - Profile pictures
- `covers` - Album/song covers
- `music` - Audio files
- `videos` - Video files
- `products` - Merchandise images
- `hero` - Hero slider images
- `tickets` - Ticket QR codes

### Deployment

The app is Vercel-ready:
1. Push your code to GitHub
2. Connect to Vercel
3. Configure environment variables
4. Deploy!

## Super Admin Setup

The **first user to register** will automatically become the Super Admin.

**Super Admin Email**: topkuchalo@gmail.com (register with this email)

Super Admin has access to:
- All admin features
- User management
- Site settings
- Payment management

## Mobile Money Payment Flow

1. User selects a plan (e.g., Artist plan)
2. User enters their MTN or Airtel phone number
3. System validates phone number format
4. User clicks "Pay Now"
5. Payment request sent via Lipila API
6. User receives SMS on their phone
7. User enters PIN to confirm
8. **If successful**: Account activated, user gets access
9. **If failed**: User sees error message, must try again

### Supported Networks
- **MTN**: 076, 095, 096 prefixes
- **Airtel**: 077, 078, 079 prefixes

## Project Structure

```
src/
├── assets/
├── components/
│   ├── common/
│   ├── music/
│   ├── video/
│   ├── store/
│   ├── player/
│   ├── forms/
│   ├── layout/
│   └── ui/
├── pages/
│   ├── admin/      (Admin dashboard pages)
│   ├── artist/     (Artist dashboard pages)
│   └── ...
├── hooks/          (TanStack Query hooks)
├── services/       (API services)
├── lib/            (Supabase client)
├── store/          (Zustand stores)
├── constants/      (App constants)
├── types/          (TypeScript types)
├── utils/          (Utility functions)
└── App.tsx

supabase/
├── schema.sql     (Main database schema)
├── migrations/     (Database migrations)
├── storage/       (Storage bucket configs)
└── functions/     (Edge functions)
```

## License

MIT
