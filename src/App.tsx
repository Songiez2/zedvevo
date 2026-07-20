import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useAuthStore, useCartStore } from '@/store'
import { Header, MobileNav, Footer } from '@/components/layout'
import { MusicPlayer } from '@/components/player'
import { useAuthStore as useAuth } from '@/store/authStore'
import { useCartStore as useCart } from '@/store/cartStore'

// Pages
import HomePage from '@/pages/HomePage'
import MusicPage from '@/pages/MusicPage'
import SongPage from '@/pages/SongPage'
import VideosPage from '@/pages/VideosPage'
import VideoPage from '@/pages/VideoPage'
import StorePage from '@/pages/StorePage'
import MerchandisePage from '@/pages/MerchandisePage'
import CartPage from '@/pages/CartPage'
import ArtistsPage from '@/pages/ArtistsPage'
import ArtistPage from '@/pages/ArtistPage'
import LibraryPage from '@/pages/LibraryPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import SettingsPage from '@/pages/SettingsPage'
import ArtistDashboard from '@/pages/artist/Dashboard'
import ArtistUpload from '@/pages/artist/Upload'
import ArtistAlbums from '@/pages/artist/Albums'
import ArtistVideos from '@/pages/artist/Videos'
import ArtistEvents from '@/pages/artist/Events'
import ArtistMerchandise from '@/pages/artist/Merchandise'
import ArtistAnalytics from '@/pages/artist/Analytics'
import AdminDashboard from '@/pages/admin/Dashboard'
import AdminUsers from '@/pages/admin/Users'
import AdminArtists from '@/pages/admin/Artists'
import AdminSongs from '@/pages/admin/Songs'
import AdminAlbums from '@/pages/admin/Albums'
import AdminVideos from '@/pages/admin/Videos'
import AdminCategories from '@/pages/admin/Categories'
import AdminMerchandise from '@/pages/admin/Merchandise'
import AdminPayments from '@/pages/admin/Payments'
import AdminOrders from '@/pages/admin/Orders'
import AdminSettings from '@/pages/admin/Settings'
import BecomeArtistPage from '@/pages/BecomeArtistPage'
import PlansPage from '@/pages/PlansPage'
import CheckoutSuccessPage from '@/pages/CheckoutSuccessPage'
import NotFoundPage from '@/pages/NotFoundPage'

function App() {
  const location = useLocation()
  const { fetchUser } = useAuthStore()
  const { fetchCart } = useCartStore()
  const { isAuthenticated } = useAuthStore()

  const isAdminRoute = location.pathname.startsWith('/admin')
  const isArtistRoute = location.pathname.startsWith('/artist') && !location.pathname.startsWith('/artist/')

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart()
    }
  }, [isAuthenticated, fetchCart])

  // Hide layout on auth pages
  const hideLayout = ['/login', '/register', '/forgot-password', '/reset-password'].some(
    (path) => location.pathname === path || location.pathname.startsWith('/admin')
  )

  return (
    <div className="min-h-screen bg-background">
      {!hideLayout && <Header />}

      <main className={`${!hideLayout ? 'pb-20 md:pb-0' : ''}`}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/music" element={<MusicPage />} />
          <Route path="/music/:slug" element={<SongPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/video/:slug" element={<VideoPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/store/:slug" element={<MerchandisePage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/artist/:id" element={<ArtistPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/artist/become" element={<BecomeArtistPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />

          {/* Artist Routes */}
          <Route path="/artist" element={<ArtistDashboard />} />
          <Route path="/artist/upload" element={<ArtistUpload />} />
          <Route path="/artist/upload-video" element={<ArtistUpload />} />
          <Route path="/artist/albums" element={<ArtistAlbums />} />
          <Route path="/artist/songs" element={<ArtistDashboard />} />
          <Route path="/artist/videos" element={<ArtistVideos />} />
          <Route path="/artist/events" element={<ArtistEvents />} />
          <Route path="/artist/merchandise" element={<ArtistMerchandise />} />
          <Route path="/artist/analytics" element={<ArtistAnalytics />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/artists" element={<AdminArtists />} />
          <Route path="/admin/songs" element={<AdminSongs />} />
          <Route path="/admin/albums" element={<AdminAlbums />} />
          <Route path="/admin/videos" element={<AdminVideos />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/merchandise" element={<AdminMerchandise />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/settings" element={<AdminSettings />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      {!hideLayout && <Footer />}
      {!hideLayout && <MusicPlayer />}
      {!hideLayout && <MobileNav />}
    </div>
  )
}

export default App
