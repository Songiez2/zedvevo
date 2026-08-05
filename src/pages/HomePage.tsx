import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Play, Clock, Users, TrendingUp, Disc, Calendar, ShoppingBag, Share2, Facebook, MessageCircle, Link as LinkIcon, Upload, Star } from 'lucide-react'
import { useState } from 'react'
import { useHeroSliders, useFeaturedSongs, useTrendingSongs, useFeaturedAlbums, useFeaturedArtists, useFeaturedMerchandise, useUpcomingEvents } from '@/hooks'
import { usePlayerStore, useAuthStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { UserAvatar } from '@/components/ui/avatar'
import { formatDuration, formatNumber, formatPrice, formatDate } from '@/utils'

function ShareButton({ song }: { song: any }) {
  const [showShare, setShowShare] = useState(false)
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/music/${song.slug}` : ''
  const shareTitle = `${song.title} by ${song.artist?.stage_name || 'Unknown'} on ZedVevo`
  const shareImage = song.cover_url || song.thumbnail_url || ''
  
  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl)
    setShowShare(false)
    // Also copy og:image meta for rich link previews
  }
  
  const shareWhatsApp = () => {
    const text = `${shareTitle}\n\n${shareUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    setShowShare(false)
  }
  
  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareTitle)}`, '_blank')
    setShowShare(false)
  }
  
  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
    setShowShare(false)
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); setShowShare(!showShare) }}
      >
        <Share2 className="h-4 w-4" />
      </Button>
      {showShare && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-dark-gray border border-border rounded-lg shadow-lg p-2 min-w-[160px]">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border mb-1">
            {shareImage && (
              <img src={shareImage} alt="" className="w-8 h-8 rounded object-cover" />
            )}
            <span className="text-xs text-gray-400 truncate max-w-[100px]">{song.title}</span>
          </div>
          <button onClick={copyLink} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-mid-gray rounded text-sm text-white">
            <LinkIcon className="h-4 w-4" /> Copy Link
          </button>
          <button onClick={shareFacebook} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-mid-gray rounded text-sm text-white">
            <Facebook className="h-4 w-4 text-blue-500" /> Facebook
          </button>
          <button onClick={shareWhatsApp} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-mid-gray rounded text-sm text-white">
            <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp
          </button>
          <button onClick={shareTwitter} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-mid-gray rounded text-sm text-white">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> X/Twitter
          </button>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const { playSong, currentSong, isPlaying } = usePlayerStore()
  const { isAuthenticated, isAdmin, isArtist } = useAuthStore()
  const { data: sliders, isLoading: slidersLoading } = useHeroSliders()
  const { data: featuredSongs, isLoading: songsLoading } = useFeaturedSongs(8)
  const { data: trendingSongs } = useTrendingSongs(10)
  const { data: featuredAlbums } = useFeaturedAlbums(6)
  const { data: featuredArtists } = useFeaturedArtists(6)
  const { data: merchandise } = useFeaturedMerchandise(4)
  const { data: events } = useUpcomingEvents(3)

  // Get top streamed song for hero
  const topSong = trendingSongs?.[0]

  return (
    <div className="min-h-screen">
      {/* Hero Slider */}
      <section className="relative h-[500px] md:h-[600px] overflow-hidden">
        {slidersLoading ? (
          <Skeleton className="w-full h-full" />
        ) : sliders && sliders.length > 0 ? (
          <div className="relative w-full h-full">
            <img
              src={sliders[0].image_url}
              alt={sliders[0].title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-black via-deep-black/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="container"
              >
                <Badge className="mb-4">{sliders[0].subtitle}</Badge>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                  {sliders[0].title}
                </h1>
                <div className="flex gap-4">
                  {sliders[0].button_text && (
                    <Link to={sliders[0].button_link || '/'}>
                      <Button size="lg" className="mt-4">
                        {sliders[0].button_text}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                  {topSong && (
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className="mt-4 bg-white/10 backdrop-blur-sm"
                      onClick={() => playSong(topSong, trendingSongs || [])}
                    >
                      <Play className="mr-2 h-5 w-5" />
                      Play Top Song
                    </Button>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        ) : topSong ? (
          <div className="relative w-full h-full">
            <img
              src={topSong.cover_url || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200'}
              alt={topSong.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep-black via-deep-black/70 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-2xl px-4"
              >
                <Badge className="mb-4 bg-electric/80">🔥 #1 Trending Now</Badge>
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                  {topSong.title}
                </h1>
                <p className="text-xl text-gray-300 mb-2">
                  {topSong.artist?.stage_name || 'Unknown Artist'}
                </p>
                <p className="text-gray-400 mb-6">
                  {formatNumber(topSong.play_count)} plays • {formatDuration(topSong.duration)}
                </p>
                <div className="flex flex-wrap gap-4 justify-center">
                  <Button 
                    size="lg" 
                    className="bg-electric hover:bg-electric/80"
                    onClick={() => playSong(topSong, trendingSongs || [])}
                  >
                    <Play className="mr-2 h-5 w-5" fill="currentColor" />
                    {currentSong?.id === topSong.id && isPlaying ? 'Pause' : 'Play Now'}
                  </Button>
                  <Link to="/music">
                    <Button size="lg" variant="outline">
                      Browse All Music
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-4 justify-center mt-6">
                  {!isAuthenticated ? (
                    <Link to="/login">
                      <Button size="sm" variant="outline">
                        <Star className="mr-2 h-4 w-4" /> Become an Artist
                      </Button>
                    </Link>
                  ) : !isArtist ? (
                    <Link to="/artist/become">
                      <Button size="sm" variant="outline">
                        <Star className="mr-2 h-4 w-4" /> Become an Artist
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/artist/upload">
                      <Button size="sm" variant="outline">
                        <Upload className="mr-2 h-4 w-4" /> Upload Song
                      </Button>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link to="/admin">
                      <Button size="sm" variant="secondary">
                        Admin Dashboard
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-electric-blue/20 to-electric/10 flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
                Welcome to <span className="gradient-text">ZedVevo</span>
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                The best Zambian music streaming platform
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/register">
                  <Button size="lg">Get Started</Button>
                </Link>
                {!isAuthenticated ? (
                  <Link to="/login">
                    <Button size="lg" variant="outline">
                      <Star className="mr-2 h-5 w-5" /> Become an Artist
                    </Button>
                  </Link>
                ) : !isArtist ? (
                  <Link to="/artist/become">
                    <Button size="lg" variant="outline">
                      <Star className="mr-2 h-5 w-5" /> Become an Artist
                    </Button>
                  </Link>
                ) : (
                  <Link to="/artist/upload">
                    <Button size="lg" variant="outline">
                      <Upload className="mr-2 h-5 w-5" /> Upload Song
                    </Button>
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin">
                    <Button size="lg" variant="secondary">
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="container px-4 py-12 space-y-16">
        {/* Featured Songs */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Featured Songs</h2>
            <Link to="/music">
              <Button variant="ghost" className="text-electric">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {songsLoading ? (
              Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)
            ) : (
              featuredSongs?.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="group cursor-pointer overflow-hidden"
                    onClick={() => playSong(song, featuredSongs || [])}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={song.cover_url || '/placeholder.jpg'}
                        alt={song.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          size="icon"
                          className="rounded-full h-12 w-12"
                        >
                          {currentSong?.id === song.id && isPlaying ? (
                            <div className="h-4 w-4 bg-white rounded-full animate-pulse" />
                          ) : (
                            <Play className="h-5 w-5 ml-0.5" />
                          )}
                        </Button>
                      </div>
                      {song.access === 'premium' && (
                        <Badge variant="premium" className="absolute top-2 right-2">
                          {song.price > 0 ? `K${song.price}` : 'Premium'}
                        </Badge>
                      )}
                      <div className="absolute top-2 left-2">
                        <ShareButton song={song} />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-white truncate">{song.title}</h3>
                      <p className="text-sm text-gray-400 truncate">
                        {song.artist?.stage_name || 'Unknown Artist'}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {formatNumber(song.play_count)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(song.duration)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </section>

        {/* Trending Songs */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-electric" />
              Trending Now
            </h2>
            <Link to="/music?sort=popular">
              <Button variant="ghost" className="text-electric">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {trendingSongs?.slice(0, 5).map((song, index) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className="group cursor-pointer hover:bg-mid-gray transition-colors"
                  onClick={() => playSong(song, trendingSongs || [])}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-600 w-8 text-center">
                      {index + 1}
                    </span>
                    <img
                      src={song.cover_url || '/placeholder.jpg'}
                      alt={song.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{song.title}</h3>
                      <p className="text-sm text-gray-400 truncate">
                        {song.artist?.stage_name || 'Unknown Artist'}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatNumber(song.play_count)} plays</span>
                      <span>{formatDuration(song.duration)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Play className="h-5 w-5" />
                    </Button>
                    <ShareButton song={song} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Featured Albums */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Disc className="h-6 w-6 text-electric" />
              Featured Albums
            </h2>
            <Link to="/music?type=albums">
              <Button variant="ghost" className="text-electric">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredAlbums?.map((album) => (
              <Link key={album.id} to={`/album/${album.slug}`}>
                <Card className="group cursor-pointer overflow-hidden">
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={album.cover_url || '/placeholder.jpg'}
                      alt={album.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-white truncate text-sm">{album.title}</h3>
                    <p className="text-xs text-gray-400 truncate">
                      {album.artist?.stage_name || 'Unknown Artist'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Artists */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="h-6 w-6 text-electric" />
              Featured Artists
            </h2>
            <Link to="/artists">
              <Button variant="ghost" className="text-electric">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredArtists?.map((artist) => (
              <Link key={artist.id} to={`/artist/${artist.id}`}>
                <Card className="group cursor-pointer overflow-hidden text-center">
                  <CardContent className="p-4">
                    <div className="relative mx-auto mb-3">
                      <UserAvatar
                        name={artist.stage_name}
                        image={artist.user?.avatar_url}
                        size="xl"
                        className="mx-auto"
                      />
                      {artist.verified && (
                        <Badge className="absolute -bottom-1 left-1/2 -translate-x-1/2" variant="default">
                          ✓
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-white truncate">{artist.stage_name}</h3>
                    <p className="text-xs text-gray-400">
                      {formatNumber(artist.total_followers)} followers
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Merchandise */}
        {merchandise && merchandise.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-electric" />
                Featured Merchandise
              </h2>
              <Link to="/store">
                <Button variant="ghost" className="text-electric">
                  Shop Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {merchandise.map((item) => (
                <Link key={item.id} to={`/store/${item.slug}`}>
                  <Card className="group cursor-pointer overflow-hidden">
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={item.images?.[0] || '/placeholder.jpg'}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      {item.is_featured && (
                        <Badge className="absolute top-2 left-2">Featured</Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-white truncate text-sm">{item.title}</h3>
                      <p className="text-electric font-semibold">{formatPrice(item.price)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events */}
        {events && events.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Calendar className="h-6 w-6 text-electric" />
                Upcoming Events
              </h2>
              <Link to="/events">
                <Button variant="ghost" className="text-electric">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {events.map((event) => (
                <Link key={event.id} to={`/event/${event.slug}`}>
                  <Card className="group cursor-pointer overflow-hidden">
                    <div className="relative h-40 overflow-hidden">
                      <img
                        src={event.banner_url || '/placeholder-event.jpg'}
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <p className="text-sm text-electric font-semibold">
                          {formatDate(event.event_date, 'MMM d, yyyy')}
                        </p>
                        <h3 className="text-lg font-bold text-white">{event.title}</h3>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-400 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {event.venue}, {event.city}
                      </p>
                      <p className="text-electric font-semibold mt-2">
                        From {formatPrice(event.ticket_price)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
