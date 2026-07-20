import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Play, Clock, Search } from 'lucide-react'
import { useVideos } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDuration, formatNumber } from '@/utils'

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const { data: videos, isLoading } = useVideos()

  const filteredVideos = videos?.filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.artist?.stage_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-electric-blue/10 to-transparent py-12">
        <div className="container px-4">
          <h1 className="text-4xl font-bold text-white mb-2">Videos</h1>
          <p className="text-gray-400">Watch music videos and live sessions</p>
        </div>
      </div>

      <div className="container px-4 py-8">
        <div className="mb-8">
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-80" />)
          ) : (
            filteredVideos?.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/video/${video.slug}`}>
                  <Card className="group cursor-pointer overflow-hidden">
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={video.thumbnail_url || '/placeholder-video.jpg'}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                          <Play className="h-8 w-8 text-white ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs text-white">
                        {formatDuration(video.duration)}
                      </div>
                      {video.access === 'premium' && (
                        <Badge variant="premium" className="absolute top-2 left-2">
                          Premium
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-white mb-2 line-clamp-2">{video.title}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{video.artist?.stage_name || 'Unknown Artist'}</span>
                        <span>{formatNumber(video.view_count)} views</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
