import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Grid, List, Search } from 'lucide-react'
import { useSongs, useAlbums, useCategories } from '@/hooks'
import { usePlayerStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDuration, formatNumber } from '@/utils'

export default function MusicPage() {
  const [searchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const sortBy = searchParams.get('sort') || 'newest'
  const genreId = searchParams.get('genre') || undefined

  const { data: songs, isLoading: songsLoading } = useSongs(genreId)
  const { data: albums, isLoading: albumsLoading } = useAlbums(genreId)
  const { data: categories } = useCategories()
  const { playSong, currentSong, isPlaying, setQueue, queueIndex } = usePlayerStore()

  const filteredSongs = songs?.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist?.stage_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handlePlayAll = () => {
    if (filteredSongs && filteredSongs.length > 0) {
      setQueue(filteredSongs, 0)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-b from-electric-blue/10 to-transparent py-12">
        <div className="container px-4">
          <h1 className="text-4xl font-bold text-white mb-2">Music</h1>
          <p className="text-gray-400">Discover and stream the best Zambian music</p>
        </div>
      </div>

      <div className="container px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="flex gap-2">
            <Select defaultValue={sortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="trending">Trending</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue={genreId || 'all'}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">
            {filteredSongs?.length || 0} songs
          </p>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {songsLoading ? (
              Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)
            ) : (
              filteredSongs?.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="group cursor-pointer overflow-hidden"
                    onClick={() => playSong(song, filteredSongs || [])}
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
                          Premium
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-white truncate text-sm">{song.title}</h3>
                      <p className="text-xs text-gray-400 truncate">
                        {song.artist?.stage_name || 'Unknown Artist'}
                      </p>
                      <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>{formatNumber(song.play_count)} plays</span>
                        <span>{formatDuration(song.duration)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {songsLoading ? (
              Array(10).fill(0).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : (
              filteredSongs?.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className={`group cursor-pointer hover:bg-mid-gray transition-colors ${
                      currentSong?.id === song.id ? 'bg-mid-gray' : ''
                    }`}
                    onClick={() => playSong(song, filteredSongs || [])}
                  >
                    <CardContent className="p-3 flex items-center gap-4">
                      <span className="text-lg font-bold text-gray-600 w-6 text-center">
                        {index + 1}
                      </span>
                      <img
                        src={song.cover_url || '/placeholder.jpg'}
                        alt={song.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${currentSong?.id === song.id ? 'text-electric' : 'text-white'}`}>
                          {song.title}
                        </h3>
                        <p className="text-sm text-gray-400 truncate">
                          {song.artist?.stage_name || 'Unknown Artist'}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
                        <span className="w-20 truncate">{song.genre?.name || 'Unknown'}</span>
                        <span className="w-16">{formatDuration(song.duration)}</span>
                        <span className="w-20">{formatNumber(song.play_count)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100"
                      >
                        <Play className="h-5 w-5" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
