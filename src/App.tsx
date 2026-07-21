import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import ToastProvider from '@/contexts/ToastContext'
import Layout from '@/components/layout/Layout'
import RequireAuth from '@/components/layout/RequireAuth'
import RequireRole from '@/components/layout/RequireRole'
import ScrollToTop from '@/components/layout/ScrollToTop'

// Inline spinner used as Suspense fallback for all lazy pages
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// Public pages
const Home = lazy(() => import('@/pages/Home'))
const DiscoverPage = lazy(() => import('@/pages/Discover'))
const MusicPage = lazy(() => import('@/pages/Music'))
const VideosPage = lazy(() => import('@/pages/Videos'))
const StorePage = lazy(() => import('@/pages/Store'))
const EventsPage = lazy(() => import('@/pages/Events'))
const SearchPage = lazy(() => import('@/pages/Search'))
const ArtistPublicPage = lazy(() => import('@/pages/ArtistPublic'))
const SongDetailPage = lazy(() => import('@/pages/SongDetail'))
const VideoDetailPage = lazy(() => import('@/pages/VideoDetail'))
const ProductDetailPage = lazy(() => import('@/pages/ProductDetail'))
const EventDetailPage = lazy(() => import('@/pages/EventDetail'))

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/Login'))
const RegisterPage = lazy(() => import('@/pages/auth/Register'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPassword'))

// User pages
const LibraryPage = lazy(() => import('@/pages/user/Library'))
const ProfileSettingsPage = lazy(() => import('@/pages/user/ProfileSettings'))
const NotificationsPage = lazy(() => import('@/pages/user/Notifications'))
const BecomeArtistPage = lazy(() => import('@/pages/user/BecomeArtist'))

// Artist pages
const ArtistDashboard = lazy(() => import('@/pages/artist/Dashboard'))
const ArtistUpload = lazy(() => import('@/pages/artist/Upload'))
const ArtistSongs = lazy(() => import('@/pages/artist/Songs'))
const ArtistAlbums = lazy(() => import('@/pages/artist/Albums'))
const ArtistVideos = lazy(() => import('@/pages/artist/Videos'))
const ArtistProducts = lazy(() => import('@/pages/artist/Products'))
const ArtistEvents = lazy(() => import('@/pages/artist/Events'))
const ArtistAnalytics = lazy(() => import('@/pages/artist/Analytics'))
const ArtistSubscription = lazy(() => import('@/pages/artist/Subscription'))
const ArtistSettings = lazy(() => import('@/pages/artist/Settings'))

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminUsers = lazy(() => import('@/pages/admin/Users'))
const AdminArtists = lazy(() => import('@/pages/admin/Artists'))
const AdminSongs = lazy(() => import('@/pages/admin/Songs'))
const AdminAlbums = lazy(() => import('@/pages/admin/Albums'))
const AdminVideos = lazy(() => import('@/pages/admin/Videos'))
const AdminProducts = lazy(() => import('@/pages/admin/Products'))
const AdminTickets = lazy(() => import('@/pages/admin/Tickets'))
const AdminOrders = lazy(() => import('@/pages/admin/Orders'))
const AdminPayments = lazy(() => import('@/pages/admin/Payments'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))
const AdminReports = lazy(() => import('@/pages/admin/Reports'))
const AdminCategories = lazy(() => import('@/pages/admin/Categories'))
const AdminNotifications = lazy(() => import('@/pages/admin/Notifications'))
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'))
const AdminAdvertisements = lazy(() => import('@/pages/admin/Advertisements'))
const AdminSponsors = lazy(() => import('@/pages/admin/Sponsors'))
const AdminHomepage = lazy(() => import('@/pages/admin/Homepage'))
const AdminAuditLogs = lazy(() => import('@/pages/admin/AuditLogs'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes with main layout */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/stream" element={<DiscoverPage />} />
                  <Route path="/music" element={<MusicPage />} />
                  <Route path="/music/:id" element={<SongDetailPage />} />
                  <Route path="/videos" element={<VideosPage />} />
                  <Route path="/videos/:id" element={<VideoDetailPage />} />
                  <Route path="/store" element={<StorePage />} />
                  <Route path="/store/:id" element={<ProductDetailPage />} />
                  <Route path="/events" element={<EventsPage />} />
                  <Route path="/events/:id" element={<EventDetailPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/artists/:id" element={<ArtistPublicPage />} />

                  {/* Auth routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Protected user routes */}
                  <Route element={<RequireAuth />}>
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/profile" element={<ProfileSettingsPage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/become-artist" element={<BecomeArtistPage />} />
                  </Route>
                </Route>

                {/* Artist dashboard — protected */}
                <Route element={<RequireRole roles={['artist', 'admin']} />}>
                  <Route path="/artist/dashboard" element={<ArtistDashboard />} />
                  <Route path="/artist/upload" element={<ArtistUpload />} />
                  <Route path="/artist/songs" element={<ArtistSongs />} />
                  <Route path="/artist/albums" element={<ArtistAlbums />} />
                  <Route path="/artist/videos" element={<ArtistVideos />} />
                  <Route path="/artist/products" element={<ArtistProducts />} />
                  <Route path="/artist/events" element={<ArtistEvents />} />
                  <Route path="/artist/analytics" element={<ArtistAnalytics />} />
                  <Route path="/artist/subscription" element={<ArtistSubscription />} />
                  <Route path="/artist/settings" element={<ArtistSettings />} />
                </Route>

                {/* Admin dashboard — protected */}
                <Route element={<RequireRole roles={['admin']} />}>
                  <Route path="/admin/dashboard"      element={<AdminDashboard />} />
                  <Route path="/admin/users"          element={<AdminUsers />} />
                  <Route path="/admin/artists"        element={<AdminArtists />} />
                  <Route path="/admin/songs"          element={<AdminSongs />} />
                  <Route path="/admin/albums"         element={<AdminAlbums />} />
                  <Route path="/admin/videos"         element={<AdminVideos />} />
                  <Route path="/admin/products"       element={<AdminProducts />} />
                  <Route path="/admin/tickets"        element={<AdminTickets />} />
                  <Route path="/admin/orders"         element={<AdminOrders />} />
                  <Route path="/admin/payments"       element={<AdminPayments />} />
                  <Route path="/admin/settings"       element={<AdminSettings />} />
                  <Route path="/admin/reports"        element={<AdminReports />} />
                  <Route path="/admin/analytics"      element={<AdminAnalytics />} />
                  <Route path="/admin/categories"     element={<AdminCategories />} />
                  <Route path="/admin/notifications"  element={<AdminNotifications />} />
                  <Route path="/admin/advertisements" element={<AdminAdvertisements />} />
                  <Route path="/admin/sponsors"       element={<AdminSponsors />} />
                  <Route path="/admin/homepage"       element={<AdminHomepage />} />
                  <Route path="/admin/audit-logs"     element={<AdminAuditLogs />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
