import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Music, Video, ShoppingBag, Ticket, Search, Bell, User, LogOut,
  Menu, X, LayoutDashboard, Mic2, ChevronDown, Heart
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getNotifications, markAllNotificationsRead, getSponsors } from '@/db/api'
import DonateModal from '@/components/ui/DonateModal'

const navLinks = [
  { to: '/music', label: 'Music', icon: Music },
  { to: '/videos', label: 'Videos', icon: Video },
  { to: '/store', label: 'Store', icon: ShoppingBag },
  { to: '/events', label: 'Events', icon: Ticket },
]

export default function Navbar() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [donateOpen, setDonateOpen] = useState(false)

  // Fetch unread notification count (poll every 20s, refetch on window focus)
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => getNotifications(profile!.id),
    enabled: !!profile?.id,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
  const unreadCount = notifications.filter(n => !n.read).length

  // Sponsors for ticker bar
  const { data: sponsors = [] } = useQuery({
    queryKey: ['sponsors-active'],
    queryFn: () => getSponsors(false),
    staleTime: 5 * 60_000,
  })

  const handleBellClick = async () => {
    // Clear count immediately by marking all read, then navigate
    if (profile?.id && unreadCount > 0) {
      await markAllNotificationsRead(profile.id)
      qc.setQueryData(['notifications', profile.id], (old: typeof notifications) =>
        (old ?? []).map(n => ({ ...n, read: true }))
      )
    }
    navigate('/notifications')
  }

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    navigate('/')
  }

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <>
    <header className="sticky top-0 z-50 bg-bg-primary/95 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo + Donate */}
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-brand font-bold text-xl tracking-tight">Zed<span className="text-text-primary">Vevo</span></span>
            </Link>
            <button
              onClick={() => setDonateOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-text-muted hover:text-brand hover:bg-brand/10 transition-colors"
              title="Donate to support ZedVevo"
            >
              <Heart size={15} className="text-brand" />
              <span className="hidden sm:block text-xs font-medium text-brand">Donate</span>
            </button>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(to)
                    ? 'text-brand bg-brand/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Link to="/search" className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-card transition-colors">
              <Search size={18} />
            </Link>

            {session ? (
              <>
                <button
                  onClick={handleBellClick}
                  className="relative p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-card transition-colors"
                  title="Notifications"
                >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-brand text-white rounded-full px-1 leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-card transition-colors"
                  >
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                      : <div className="w-7 h-7 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">
                          {(profile?.full_name || profile?.username || profile?.email || 'U')[0].toUpperCase()}
                        </div>
                    }
                    <span className="hidden sm:block text-sm text-text-primary max-w-[100px] truncate">
                      {profile?.full_name || profile?.username || 'Account'}
                    </span>
                    <ChevronDown size={14} className="text-text-muted" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute right-0 mt-2 w-52 bg-bg-card border border-border rounded-xl shadow-xl py-1 z-50"
                      >
                        <Link to="/library" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors">
                          <Music size={15} /> My Library
                        </Link>
                        <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors">
                          <User size={15} /> Profile Settings
                        </Link>
                        {(profile?.role === 'artist' || profile?.role === 'admin') && (
                          <Link to="/artist/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors">
                            <Mic2 size={15} /> Artist Dashboard
                          </Link>
                        )}
                        {profile?.role === 'admin' && (
                          <Link to="/admin/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors">
                            <LayoutDashboard size={15} /> Admin Panel
                          </Link>
                        )}
                        {profile?.role === 'user' && (
                          <Link to="/artist/subscription" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand hover:text-brand/80 hover:bg-bg-secondary transition-colors">
                            <Mic2 size={15} /> Become an Artist
                          </Link>
                        )}
                        <div className="border-t border-border mt-1 pt-1">
                          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-bg-secondary transition-colors">
                            <LogOut size={15} /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="px-4 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">Sign In</Link>
                <Link to="/register" className="px-4 py-1.5 text-sm bg-brand hover:bg-brand-hover text-white rounded-lg font-medium transition-colors">Sign Up</Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(v => !v)} className="md:hidden p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-card">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Sponsors ticker bar */}
      {sponsors.length > 0 && (
        <div className="border-t border-border bg-bg-secondary/60 py-1.5 px-4 overflow-hidden">
          <div className="flex items-center gap-1 text-xs text-text-muted mb-0.5 max-w-7xl mx-auto">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Sponsors</span>
          </div>
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none max-w-7xl mx-auto pb-0.5">
            {sponsors.map(s => (
              s.website_url
                ? <a key={s.id} href={s.website_url} target="_blank" rel="noopener noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity">
                    {s.logo_url
                      ? <img src={s.logo_url} alt={s.name} className="h-5 max-w-[80px] object-contain" />
                      : <span className="text-xs font-semibold text-text-secondary">{s.name}</span>
                    }
                  </a>
                : <span key={s.id} className="flex-shrink-0 flex items-center gap-1.5 opacity-60">
                    {s.logo_url
                      ? <img src={s.logo_url} alt={s.name} className="h-5 max-w-[80px] object-contain" />
                      : <span className="text-xs font-semibold text-text-secondary">{s.name}</span>
                    }
                  </span>
            ))}
          </div>
        </div>
      )}

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-bg-secondary"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(to) ? 'text-brand bg-brand/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                  }`}
                >
                  <Icon size={16} /> {label}
                </Link>
              ))}
              {!session && (
                <div className="pt-2 flex gap-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-2 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary">Sign In</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="flex-1 text-center py-2 text-sm bg-brand text-white rounded-lg font-medium">Sign Up</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
    <DonateModal isOpen={donateOpen} onClose={() => setDonateOpen(false)} />
    </>
  )
}
