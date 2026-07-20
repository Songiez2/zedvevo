import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store'
import { useFavorites, usePlaylists, usePurchases } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Play, Heart, Download, ShoppingBag, ListMusic, Disc } from 'lucide-react'
import { formatDate } from '@/utils'

export default function LibraryPage() {
  const { isAuthenticated } = useAuthStore()
  const { data: favorites } = useFavorites()
  const { data: playlists } = usePlaylists()
  const { data: purchases } = usePurchases()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign in to view your library</h1>
          <Link to="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-b from-electric-blue/10 to-transparent py-12">
        <div className="container px-4">
          <h1 className="text-4xl font-bold text-white mb-2">Your Library</h1>
          <p className="text-gray-400">Manage your music, playlists, and purchases</p>
        </div>
      </div>

      <div className="container px-4 py-8">
        <Tabs defaultValue="favorites" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="favorites">Liked Songs</TabsTrigger>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="downloads">Downloads</TabsTrigger>
          </TabsList>

          <TabsContent value="favorites">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Heart className="h-6 w-6 text-red-500" />
                Liked Songs
              </h2>
              <span className="text-gray-400">{favorites?.length || 0} songs</span>
            </div>

            {favorites && favorites.length > 0 ? (
              <div className="grid gap-2">
                {favorites.map((fav) => (
                  <Card key={fav.id} className="hover:bg-mid-gray transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      {fav.song && (
                        <>
                          <img
                            src={fav.song.cover_url || '/placeholder.jpg'}
                            alt=""
                            className="w-12 h-12 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white truncate">
                              {fav.song.title}
                            </h3>
                            <p className="text-sm text-gray-400 truncate">
                              {fav.song.artist?.stage_name}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(fav.created_at)}
                          </span>
                          <Button variant="ghost" size="icon">
                            <Play className="h-5 w-5" />
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Heart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No liked songs yet</h3>
                <p className="text-gray-400">Songs you like will appear here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="playlists">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ListMusic className="h-6 w-6 text-electric" />
                Your Playlists
              </h2>
              <Button>Create Playlist</Button>
            </div>

            {playlists && playlists.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {playlists.map((playlist) => (
                  <Card key={playlist.id} className="cursor-pointer hover:bg-mid-gray transition-colors">
                    <div className="aspect-square bg-mid-gray rounded-t-lg flex items-center justify-center">
                      <ListMusic className="h-12 w-12 text-gray-600" />
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-white truncate">{playlist.title}</h3>
                      <p className="text-xs text-gray-400">{playlist.song_count} songs</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <ListMusic className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No playlists yet</h3>
                <p className="text-gray-400">Create your first playlist</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchases">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-electric" />
                Purchased Content
              </h2>
            </div>

            {purchases && purchases.length > 0 ? (
              <div className="grid gap-2">
                {purchases.map((purchase) => (
                  <Card key={purchase.id} className="hover:bg-mid-gray transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Disc className="h-10 w-10 text-gray-500" />
                      <div className="flex-1">
                        <h3 className="font-medium text-white capitalize">{purchase.item_type}</h3>
                        <p className="text-sm text-gray-400">
                          {formatDate(purchase.purchased_at)} • ZMW {purchase.price}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No purchases yet</h3>
                <p className="text-gray-400">Your purchased content will appear here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="downloads">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Download className="h-6 w-6 text-electric" />
                Downloads
              </h2>
            </div>

            <div className="text-center py-16">
              <Download className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No downloads yet</h3>
              <p className="text-gray-400">Downloaded songs will appear here for offline listening</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
