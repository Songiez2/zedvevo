import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Search, Bell, User, LogOut, Settings, UserCircle, Menu, X } from 'lucide-react'
import { useAuthStore, useNotificationStore, useCartStore } from '@/store'
import { cn } from '@/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, UserAvatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useGlobalSearch } from '@/hooks'

export function Header() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isAdmin, isArtist, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const { getItemCount } = useCartStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const { data: searchResults } = useGlobalSearch(searchQuery)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const cartItemCount = getItemCount()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-deep-black/95 backdrop-blur supports-[backdrop-filter]:bg-deep-black/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-electric-blue to-electric">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
          <span className="text-xl font-bold text-white">ZedVevo</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Home
          </Link>
          <Link to="/music" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Music
          </Link>
          <Link to="/videos" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Videos
          </Link>
          <Link to="/store" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Store
          </Link>
          <Link to="/artists" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Artists
          </Link>
        </nav>

        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search songs, albums, artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-dark-gray/50 border-border"
            />
            {searchResults && searchResults.length > 0 && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-dark-gray border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
                {searchResults.slice(0, 10).map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    to={
                      result.type === 'song'
                        ? `/music/${result.slug}`
                        : result.type === 'album'
                        ? `/album/${result.slug}`
                        : result.type === 'artist'
                        ? `/artist/${result.id}`
                        : `/video/${result.slug}`
                    }
                    className="flex items-center gap-3 p-3 hover:bg-mid-gray transition-colors"
                    onClick={() => setSearchQuery('')}
                  >
                    {result.image && (
                      <img src={result.image} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{result.title}</p>
                      <p className="text-xs text-gray-400 truncate">{result.subtitle}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {result.type}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Search Toggle (Mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {isAuthenticated ? (
            <>
              {/* Cart */}
              {cartItemCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  onClick={() => navigate('/cart')}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-electric text-[10px] font-bold text-white">
                    {cartItemCount}
                  </span>
                </Button>
              )}

              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <UserAvatar name={user?.full_name} image={user?.avatar_url} size="sm" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/library')}>
                    <Library className="mr-2 h-4 w-4" />
                    Library
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/purchases')}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Purchases
                  </DropdownMenuItem>
                  {isArtist && (
                    <DropdownMenuItem onClick={() => navigate('/artist')}>
                      <Mic className="mr-2 h-4 w-4" />
                      Artist Dashboard
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-500">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Log in
              </Button>
              <Button onClick={() => navigate('/register')}>Sign up</Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      {isSearchOpen && (
        <div className="md:hidden p-4 border-t border-border bg-dark-gray">
          <Input
            placeholder="Search songs, albums, artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <nav className="md:hidden border-t border-border bg-dark-gray p-4">
          <div className="flex flex-col gap-4">
            <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white">
              Home
            </Link>
            <Link to="/music" className="text-sm font-medium text-gray-300 hover:text-white">
              Music
            </Link>
            <Link to="/videos" className="text-sm font-medium text-gray-300 hover:text-white">
              Videos
            </Link>
            <Link to="/store" className="text-sm font-medium text-gray-300 hover:text-white">
              Store
            </Link>
            <Link to="/artists" className="text-sm font-medium text-gray-300 hover:text-white">
              Artists
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}

// Import missing icons
import { Library, Mic, LayoutDashboard, ShoppingBag } from 'lucide-react'
