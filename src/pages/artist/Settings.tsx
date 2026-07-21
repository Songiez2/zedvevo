import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, Camera, MapPin, Music } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getArtistProfile, updateArtistProfile, uploadArtistImage } from '@/db/api'
import DashboardLayout, { artistLinks } from '@/components/layout/DashboardLayout'

export default function ArtistSettings() {
  const location = useLocation()
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [artistName, setArtistName] = useState('')
  const [bio, setBio] = useState('')
  const [genre, setGenre] = useState('')
  const [locationStr, setLocationStr] = useState('')
  const [facebook, setFacebook] = useState('')
  const [instagram, setInstagram] = useState('')
  const [twitter, setTwitter] = useState('')
  const [youtube, setYoutube] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [artistData, setArtistData] = useState<any>(null)

  useEffect(() => {
    if (!profile) return
    getArtistProfile(profile.id).then(a => {
      if (a) {
        setArtistData(a)
        setArtistName(a.artist_name || '')
        setBio((a as any).bio || '')
        setGenre(a.genre || '')
        setLocationStr(a.location || '')
        setFacebook(a.social_links?.facebook || '')
        setInstagram(a.social_links?.instagram || '')
        setTwitter(a.social_links?.twitter || '')
        setYoutube(a.social_links?.youtube || '')
      }
    })
  }, [profile])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true); setMsg('')
    let _avatarUrl = artistData?.profile?.avatar_url
    let coverUrl = artistData?.cover_url
    if (avatarFile) _avatarUrl = await uploadArtistImage(profile.id, avatarFile, 'avatar')
    if (coverFile) coverUrl = await uploadArtistImage(profile.id, coverFile, 'cover')
    await updateArtistProfile(profile.id, {
      artist_name: artistName, genre, location: locationStr,
      cover_url: coverUrl,
      social_links: { facebook, instagram, twitter, youtube },
    })
    setSaving(false); setMsg('Settings saved!')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <DashboardLayout title="Artist Dashboard" links={artistLinks} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-6">Artist Settings</h1>
        <div className="max-w-lg space-y-5">
          {/* Profile images */}
          <div className="flex gap-4">
            <div>
              <p className="text-xs text-text-muted mb-1.5">Profile Photo</p>
              <label className="block w-20 h-20 rounded-2xl overflow-hidden border-2 border-dashed border-border hover:border-brand cursor-pointer transition-colors relative">
                {artistData?.profile?.avatar_url ? <img src={artistData.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand/20 flex items-center justify-center"><Camera size={20} className="text-brand" /></div>}
                <input type="file" accept="image/*" onChange={e => setAvatarFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-muted mb-1.5">Cover Image</p>
              <label className="block h-20 rounded-2xl overflow-hidden border-2 border-dashed border-border hover:border-brand cursor-pointer transition-colors relative">
                {artistData?.cover_url ? <img src={artistData.cover_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-brand/10 flex items-center justify-center text-xs text-text-muted">Click to upload cover</div>}
                <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="hidden" />
              </label>
            </div>
          </div>

          {[
            { label: 'Artist Name', val: artistName, set: setArtistName, ph: 'Your stage name', icon: Music },
            { label: 'Genre', val: genre, set: setGenre, ph: 'e.g. Afrobeats, Zambian Music', icon: Music },
            { label: 'Location', val: locationStr, set: setLocationStr, ph: 'e.g. Lusaka, Zambia', icon: MapPin },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">{f.label}</label>
              <div className="flex items-center gap-2 bg-bg-card border border-border focus-within:border-brand rounded-xl px-3 py-2.5 transition-colors">
                <f.icon size={15} className="text-text-muted" />
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-muted" />
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Biography</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell fans about yourself…" className="w-full bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted resize-none transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Social Links</label>
            <div className="space-y-2">
              {[
                { label: 'Facebook', val: facebook, set: setFacebook, ph: 'https://facebook.com/…' },
                { label: 'Instagram', val: instagram, set: setInstagram, ph: 'https://instagram.com/…' },
                { label: 'Twitter/X', val: twitter, set: setTwitter, ph: 'https://twitter.com/…' },
                { label: 'YouTube', val: youtube, set: setYoutube, ph: 'https://youtube.com/…' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-xs text-text-muted w-20 flex-shrink-0">{s.label}</span>
                  <input value={s.val} onChange={e => s.set(e.target.value)} placeholder={s.ph} className="flex-1 bg-bg-card border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {msg && <p className="text-sm text-success">{msg}</p>}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
            {saving && <Loader2 size={15} className="animate-spin" />} Save Settings
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
