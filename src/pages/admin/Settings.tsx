import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Globe, CreditCard, Database, RefreshCw, Loader2, Mail, MessageSquare,
  Shield, HardDrive, Palette, Phone, AtSign, Building, Info,
} from 'lucide-react'
import { getAppSettings, updateAppSettings, syncJamendo } from '@/db/api'
import DashboardLayout, { adminSections } from '@/components/layout/DashboardLayout'

type Tab = 'general' | 'appearance' | 'payment' | 'email' | 'sms' | 'api' | 'storage' | 'security' | 'system'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'general',    label: 'General',    icon: Globe },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'payment',    label: 'Payment',    icon: CreditCard },
  { id: 'email',      label: 'Email',      icon: Mail },
  { id: 'sms',        label: 'SMS',        icon: MessageSquare },
  { id: 'api',        label: 'API',        icon: Database },
  { id: 'storage',    label: 'Storage',    icon: HardDrive },
  { id: 'security',   label: 'Security',   icon: Shield },
  { id: 'system',     label: 'System',     icon: Info },
]

interface FieldDef { key: string; label: string; ph?: string; type?: string; options?: string[] }

function Section({ title, icon: Icon, fields, settings, update, inputCls }: {
  title: string; icon: React.ElementType
  fields: FieldDef[]
  settings: Record<string, string>
  update: (k: string, v: string) => void
  inputCls: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={15} className="text-brand" />
        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{title}</h2>
      </div>
      <div className="space-y-4 p-5 bg-bg-card border border-border rounded-2xl">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs text-text-muted mb-1.5">{f.label}</label>
            {f.options
              ? <select value={settings[f.key] ?? ''} onChange={e => update(f.key, e.target.value)} className={inputCls}>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              : f.type === 'checkbox'
                ? <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings[f.key] === 'true'} onChange={e => update(f.key, String(e.target.checked))} className="accent-brand" />
                    <span className="text-sm text-text-secondary">{f.ph}</span>
                  </label>
                : f.type === 'textarea'
                  ? <textarea value={settings[f.key] ?? ''} onChange={e => update(f.key, e.target.value)} placeholder={f.ph} rows={3} className={`${inputCls} resize-none`} />
                  : <input type={f.type ?? 'text'} value={settings[f.key] ?? ''} onChange={e => update(f.key, e.target.value)} placeholder={f.ph} className={inputCls} />
            }
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminSettings() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [loading, setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    getAppSettings().then(rows => {
      const m: Record<string, string> = {}
      if (Array.isArray(rows)) {
        rows.forEach((r: any) => { m[r.key] = typeof r.value === 'string' ? r.value.replace(/^"|"$/g, '') : String(r.value ?? '') })
      }
      setSettings(m)
    })
  }, [])

  const update = (key: string, value: string) => setSettings(p => ({ ...p, [key]: value }))

  const flash = (m: string, isErr = false) => {
    if (isErr) setError(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setError('') }, 4000)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateAppSettings(settings)
      flash('Settings saved successfully!')
    } catch { flash('Failed to save settings', true) }
    setLoading(false)
  }

  const handleSyncJamendo = async () => {
    setSyncLoading(true)
    try {
      const result = await syncJamendo()
      flash(`Synced ${result?.count ?? 0} tracks from Jamendo`)
    } catch { flash('Jamendo sync failed', true) }
    setSyncLoading(false)
  }

  const inputCls = 'w-full bg-bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-text-primary outline-none focus:border-brand placeholder:text-text-muted transition-colors'

  const tabContent: Record<Tab, React.ReactNode> = {
    general: (
      <div className="space-y-8">
        <Section title="Application Info" icon={Globe} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'app_name',    label: 'App Name',  ph: 'ZedVevo' },
          { key: 'app_tagline', label: 'Tagline',   ph: "Zambia's Entertainment Platform" },
        ]} />
        <Section title="Contact Information" icon={Phone} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'contact_email',   label: 'Contact Email',   ph: 'support@zedvevo.com', type: 'email' },
          { key: 'contact_phone',   label: 'Contact Phone',   ph: '+260 97 123 4567' },
          { key: 'contact_address', label: 'Office Address',  ph: 'Lusaka, Zambia', type: 'textarea' },
        ]} />
        <Section title="Social Media" icon={AtSign} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'social_facebook',  label: 'Facebook URL',  ph: 'https://facebook.com/zedvevo' },
          { key: 'social_twitter',   label: 'Twitter / X',   ph: 'https://twitter.com/zedvevo' },
          { key: 'social_instagram', label: 'Instagram',     ph: 'https://instagram.com/zedvevo' },
          { key: 'social_youtube',   label: 'YouTube',       ph: 'https://youtube.com/@zedvevo' },
          { key: 'social_tiktok',    label: 'TikTok',        ph: 'https://tiktok.com/@zedvevo' },
        ]} />
      </div>
    ),
    appearance: (
      <div className="space-y-8">
        <Section title="Branding" icon={Palette} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'logo_url',       label: 'Logo URL',     ph: 'https://…/logo.png' },
          { key: 'favicon_url',    label: 'Favicon URL',  ph: 'https://…/favicon.ico' },
          { key: 'primary_color',  label: 'Primary Color (hex)', ph: '#2563eb' },
        ]} />
      </div>
    ),
    payment: (
      <div className="space-y-8">
        <Section title="Lipila Payment API" icon={CreditCard} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'lipila_api_url',       label: 'Lipila API URL',      ph: 'https://lipila.net/api' },
          { key: 'lipila_api_key',       label: 'Lipila API Key',      ph: 'sk_live_…', type: 'password' },
          { key: 'lipila_business_name', label: 'Business Name',       ph: 'ZedVevo Ltd' },
          { key: 'lipila_phone',         label: 'Receiver Phone',      ph: '0971234567' },
          { key: 'lipila_mode',          label: 'Lipila Mode',         options: ['demo', 'live'] },
        ]} />
      </div>
    ),
    email: (
      <div className="space-y-8">
        <Section title="SMTP Configuration" icon={Mail} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'smtp_host',       label: 'SMTP Host',       ph: 'smtp.gmail.com' },
          { key: 'smtp_port',       label: 'SMTP Port',       ph: '587', type: 'number' },
          { key: 'smtp_user',       label: 'SMTP Username',   ph: 'noreply@zedvevo.com' },
          { key: 'smtp_from_email', label: 'From Email',      ph: 'noreply@zedvevo.com', type: 'email' },
          { key: 'smtp_from_name',  label: 'From Name',       ph: 'ZedVevo' },
        ]} />
      </div>
    ),
    sms: (
      <div className="space-y-8">
        <Section title="SMS Provider" icon={MessageSquare} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'sms_provider',  label: 'SMS Provider', options: ['none', 'twilio', 'africastalking', 'bulksms'] },
          { key: 'sms_api_key',   label: 'API Key / Auth Token', ph: 'sk_…', type: 'password' },
          { key: 'sms_sender_id', label: 'Sender ID', ph: 'ZedVevo' },
        ]} />
      </div>
    ),
    api: (
      <div className="space-y-8">
        <Section title="Jamendo Music API" icon={Database} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'jamendo_client_id', label: 'Jamendo Client ID', ph: 'Your Jamendo client_id' },
        ]} />
        <div className="p-5 bg-bg-card border border-border rounded-2xl">
          <p className="text-xs text-text-muted mb-3">Sync latest tracks from Jamendo into the platform</p>
          <button onClick={handleSyncJamendo} disabled={syncLoading}
            className="flex items-center gap-2 px-4 py-2 bg-bg-secondary border border-border hover:border-brand text-text-secondary hover:text-text-primary text-sm font-medium rounded-xl transition-colors">
            {syncLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync Jamendo Now
          </button>
        </div>
      </div>
    ),
    storage: (
      <div className="space-y-8">
        <Section title="File Upload Limits" icon={HardDrive} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'storage_max_file_mb',  label: 'Max File Size (MB)',    ph: '50',  type: 'number' },
          { key: 'max_upload_size_mb',   label: 'Max Total Upload (MB)', ph: '500', type: 'number' },
          { key: 'allowed_audio_types',  label: 'Allowed Audio Types',   ph: 'mp3,wav,flac,aac' },
          { key: 'allowed_video_types',  label: 'Allowed Video Types',   ph: 'mp4' },
        ]} />
      </div>
    ),
    security: (
      <div className="space-y-8">
        <Section title="Authentication" icon={Shield} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'max_login_attempts',   label: 'Max Login Attempts',      ph: '10', type: 'number' },
          { key: 'session_timeout_days', label: 'Session Timeout (days)',   ph: '30', type: 'number' },
          { key: 'require_email_verify', label: 'Require Email Verification', type: 'checkbox', ph: 'Enabled' },
        ]} />
      </div>
    ),
    system: (
      <div className="space-y-8">
        <Section title="Platform Controls" icon={Building} settings={settings} update={update} inputCls={inputCls} fields={[
          { key: 'maintenance_mode',  label: 'Maintenance Mode',     type: 'checkbox', ph: 'Put site in maintenance mode' },
          { key: 'registration_open', label: 'Open Registration',    type: 'checkbox', ph: 'Allow new user registrations' },
        ]} />
      </div>
    ),
  }

  return (
    <DashboardLayout title="Admin Panel" sections={adminSections} active={location.pathname}>
      <div className="p-6 md:p-8">
        <h1 className="text-xl font-bold text-text-primary mb-1">Settings</h1>
        <p className="text-sm text-text-muted mb-8">Configure all platform settings</p>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Tab sidebar */}
          <nav className="md:w-44 flex-shrink-0">
            <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === t.id ? 'text-brand bg-brand/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'}`}>
                  <t.icon size={15} className="flex-shrink-0" />
                  {t.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Tab content */}
          <div className="flex-1 max-w-xl space-y-6">
            {tabContent[activeTab]}

            {msg   && <p className="text-sm text-success">{msg}</p>}
            {error && <p className="text-sm text-danger">{error}</p>}

            <button onClick={handleSave} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
              {loading && <Loader2 size={15} className="animate-spin" />}
              Save {TABS.find(t => t.id === activeTab)?.label} Settings
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
