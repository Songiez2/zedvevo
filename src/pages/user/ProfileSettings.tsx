import { useState, useEffect } from 'react'
import { Camera, Loader2, Bell, Globe, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile, uploadAvatar } from '@/db/api'
import { supabase } from '@/lib/supabase'
import PageSection from '@/components/ui/PageSection'

const TABS = ['Profile', 'Security', 'Preferences', 'Danger'] as const
type Tab = typeof TABS[number]

export default function ProfileSettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState<Tab>('Profile')

  // Profile form
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Security form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')

  // Preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [profilePublic, setProfilePublic] = useState(true)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setUsername(profile.username || '')
      setBio(profile.bio || '')
      setPhone(profile.phone || '')
      setNotificationsEnabled(profile.notifications_enabled)
      setProfilePublic(profile.profile_public)
    }
  }, [profile])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    const url = await uploadAvatar(profile.id, file)
    if (url) { await updateProfile(profile.id, { avatar_url: url }); await refreshProfile() }
  }

  const handleSaveProfile = async () => {
    if (!profile) return
    setSaving(true); setSaveMsg('')
    await updateProfile(profile.id, { full_name: fullName, username, bio, phone })
    await refreshProfile()
    setSaving(false); setSaveMsg('Profile updated successfully!')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { setPwMsg('Passwords do not match'); return }
    if (newPassword.length < 6) { setPwMsg('Password must be at least 6 characters'); return }
    setPwSaving(true); setPwMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    setPwMsg(error ? error.message : 'Password changed successfully!')
    if (!error) { setNewPassword(''); setConfirmPassword('') }
    setTimeout(() => setPwMsg(''), 3000)
  }

  const handleSavePrefs = async () => {
    if (!profile) return
    setSaving(true)
    await updateProfile(profile.id, { notifications_enabled: notificationsEnabled, profile_public: profilePublic })
    await refreshProfile()
    setSaving(false); setSaveMsg('Preferences saved!')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account? This cannot be undone.')) return
    await supabase.auth.signOut()
  }

  if (!profile) return null

  return (
    <div className="animate-fade-in">
      <PageSection>
        <h1 className="text-2xl font-bold text-text-primary mb-6">Profile Settings</h1>

        {/* Tabs */}
        <div className="flex gap-1.5 border-b border-border mb-8 overflow-x-auto pb-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors -mb-px ${tab === t ? 'text-brand border-b-2 border-brand' : 'text-text-secondary hover:text-text-primary'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="max-w-lg">
          {/* Profile Tab */}
          {tab === 'Profile' && (
            <div className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar" className="w-20 h-20 rounded-2xl object-cover" />
                    : <div className="w-20 h-20 rounded-2xl bg-brand/20 flex items-center justify-center text-brand text-2xl font-bold">
                        {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
                      </div>
                  }
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand hover:bg-brand-hover rounded-full flex items-center justify-center cursor-pointer transition-colors">
                    <Camera size={13} className="text-white" />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{profile.full_name || profile.username || 'User'}</p>
                  <p className="text-xs text-text-muted">{profile.email}</p>
                </div>
              </div>

              {[
                { label: 'Full Name', value: fullName, onChange: setFullName, type: 'text', placeholder: 'Your full name' },
                { label: 'Username', value: username, onChange: setUsername, type: 'text', placeholder: 'your_username' },
                { label: 'Phone Number', value: phone, onChange: setPhone, type: 'tel', placeholder: '0971234567' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">{f.label}</label>
                  <input type={f.type} value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors" />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Biography</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Tell people about yourself…"
                  className="w-full bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors resize-none" />
              </div>

              {saveMsg && <p className="text-sm text-success">{saveMsg}</p>}
              <button onClick={handleSaveProfile} disabled={saving}
                className="px-6 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />} Save Profile
              </button>
            </div>
          )}

          {/* Security Tab */}
          {tab === 'Security' && (
            <div className="space-y-5">
              <div>
                <p className="text-sm text-text-muted mb-4">Account email: <strong className="text-text-secondary">{profile.email}</strong></p>
              </div>
              {[
                { label: 'New Password', value: newPassword, onChange: setNewPassword, placeholder: 'At least 6 characters' },
                { label: 'Confirm Password', value: confirmPassword, onChange: setConfirmPassword, placeholder: 'Repeat new password' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">{f.label}</label>
                  <input type="password" value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors" />
                </div>
              ))}
              {pwMsg && <p className={`text-sm ${pwMsg.includes('successfully') ? 'text-success' : 'text-danger'}`}>{pwMsg}</p>}
              <button onClick={handleChangePassword} disabled={pwSaving || !newPassword}
                className="px-6 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center gap-2">
                {pwSaving && <Loader2 size={15} className="animate-spin" />} Change Password
              </button>
            </div>
          )}

          {/* Preferences Tab */}
          {tab === 'Preferences' && (
            <div className="space-y-5">
              {[
                { label: 'Enable Notifications', desc: 'Receive alerts about purchases, uploads, and system events', icon: Bell, value: notificationsEnabled, onChange: setNotificationsEnabled },
                { label: 'Public Profile', desc: 'Allow others to view your profile and activity', icon: Globe, value: profilePublic, onChange: setProfilePublic },
              ].map(f => (
                <div key={f.label} className="flex items-start justify-between gap-4 p-4 bg-bg-card border border-border rounded-xl">
                  <div className="flex items-start gap-3">
                    <f.icon size={18} className="text-text-muted mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{f.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                  <button onClick={() => f.onChange(!f.value)}
                    className={`w-10 h-5 rounded-full transition-colors flex-shrink-0 relative ${f.value ? 'bg-brand' : 'bg-bg-secondary border border-border'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${f.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              ))}
              {saveMsg && <p className="text-sm text-success">{saveMsg}</p>}
              <button onClick={handleSavePrefs} disabled={saving}
                className="px-6 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors flex items-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />} Save Preferences
              </button>
            </div>
          )}

          {/* Danger Tab */}
          {tab === 'Danger' && (
            <div className="space-y-4">
              <div className="p-5 border border-danger/30 bg-danger/5 rounded-xl">
                <h3 className="text-sm font-semibold text-danger mb-1.5">Delete Account</h3>
                <p className="text-sm text-text-muted mb-4">This will permanently delete your account and all associated data. This action cannot be undone.</p>
                <button onClick={handleDeleteAccount}
                  className="flex items-center gap-2 px-4 py-2 bg-danger hover:bg-danger/80 text-white text-sm font-semibold rounded-xl transition-colors">
                  <Trash2 size={15} /> Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>
      </PageSection>
    </div>
  )
}
