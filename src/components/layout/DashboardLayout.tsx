import { Link } from 'react-router-dom'
import { ReactNode, useState } from 'react'
import {
  Home, LayoutDashboard, Music, Disc, Video, BarChart2, CreditCard, Settings,
  Users, Mic2, ShoppingBag, Ticket, Package, FileText, Bell, Tag, Megaphone,
  Award, Layers, ScrollText, Menu, X, TrendingUp,
} from 'lucide-react'

interface SidebarLink { to: string; label: string; icon: ReactNode }
interface SidebarSection { heading: string; links: SidebarLink[] }

interface DashboardLayoutProps {
  children: ReactNode
  title: string
  links?: SidebarLink[]
  sections?: SidebarSection[]
  active: string
}

function NavLink({ to, icon, label, active }: SidebarLink & { active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'text-brand bg-brand/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
      }`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  )
}

export default function DashboardLayout({ children, title, links, sections, active }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const SidebarContent = () => (
    <>
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <Link to="/" className="text-brand font-bold text-lg">Zed<span className="text-text-primary">Vevo</span></Link>
        <p className="text-xs text-text-muted mt-0.5">{title}</p>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {links && links.map(link => (
          <NavLink key={link.to} {...link} active={active === link.to} />
        ))}
        {sections && sections.map(section => (
          <div key={section.heading} className="mb-4">
            <p className="px-3 py-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-widest">{section.heading}</p>
            <div className="space-y-0.5">
              {section.links.map(link => (
                <NavLink key={link.to} {...link} active={active === link.to} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-border flex-shrink-0">
        <Link to="/" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
          <Home size={14} /> Back to Site
        </Link>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex bg-bg-primary text-text-primary">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-bg-secondary border-r border-border flex-shrink-0 fixed h-full top-0 left-0 z-20">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 bg-bg-secondary border-r border-border flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-bg-secondary sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-text-secondary hover:text-text-primary">
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          {mobileOpen && (
            <button onClick={() => setMobileOpen(false)} className="ml-auto text-text-secondary hover:text-text-primary">
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const artistLinks: SidebarLink[] = [
  { to: '/artist/dashboard',    label: 'Dashboard',    icon: <LayoutDashboard size={16} /> },
  { to: '/artist/upload',       label: 'Upload',       icon: <Music size={16} /> },
  { to: '/artist/songs',        label: 'Songs',        icon: <Music size={16} /> },
  { to: '/artist/albums',       label: 'Albums',       icon: <Disc size={16} /> },
  { to: '/artist/videos',       label: 'Videos',       icon: <Video size={16} /> },
  { to: '/artist/products',     label: 'Products',     icon: <Package size={16} /> },
  { to: '/artist/events',       label: 'Events',       icon: <Ticket size={16} /> },
  { to: '/artist/analytics',    label: 'Analytics',    icon: <BarChart2 size={16} /> },
  { to: '/artist/subscription', label: 'Subscription', icon: <CreditCard size={16} /> },
  { to: '/artist/settings',     label: 'Settings',     icon: <Settings size={16} /> },
]

// eslint-disable-next-line react-refresh/only-export-components
export const adminSections: SidebarSection[] = [
  {
    heading: 'Overview',
    links: [
      { to: '/admin/dashboard',  label: 'Dashboard',  icon: <LayoutDashboard size={15} /> },
      { to: '/admin/analytics',  label: 'Analytics',  icon: <TrendingUp size={15} /> },
      { to: '/admin/reports',    label: 'Reports',    icon: <FileText size={15} /> },
    ],
  },
  {
    heading: 'Users',
    links: [
      { to: '/admin/users',         label: 'Users',         icon: <Users size={15} /> },
      { to: '/admin/artists',       label: 'Artists',       icon: <Mic2 size={15} /> },
      { to: '/admin/notifications', label: 'Notifications', icon: <Bell size={15} /> },
    ],
  },
  {
    heading: 'Content',
    links: [
      { to: '/admin/songs',      label: 'Songs',      icon: <Music size={15} /> },
      { to: '/admin/albums',     label: 'Albums',     icon: <Disc size={15} /> },
      { to: '/admin/videos',     label: 'Videos',     icon: <Video size={15} /> },
      { to: '/admin/categories', label: 'Categories', icon: <Tag size={15} /> },
    ],
  },
  {
    heading: 'Commerce',
    links: [
      { to: '/admin/products', label: 'Products', icon: <ShoppingBag size={15} /> },
      { to: '/admin/tickets',  label: 'Tickets',  icon: <Ticket size={15} /> },
      { to: '/admin/orders',   label: 'Orders',   icon: <Package size={15} /> },
      { to: '/admin/payments', label: 'Payments', icon: <CreditCard size={15} /> },
    ],
  },
  {
    heading: 'Platform',
    links: [
      { to: '/admin/homepage',      label: 'Homepage',      icon: <Layers size={15} /> },
      { to: '/admin/advertisements', label: 'Advertisements', icon: <Megaphone size={15} /> },
      { to: '/admin/sponsors',      label: 'Sponsors',      icon: <Award size={15} /> },
    ],
  },
  {
    heading: 'System',
    links: [
      { to: '/admin/settings',   label: 'Settings',   icon: <Settings size={15} /> },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: <ScrollText size={15} /> },
    ],
  },
]

// Keep for backward compat — pages that still use adminLinks
// eslint-disable-next-line react-refresh/only-export-components
export const adminLinks: SidebarLink[] = adminSections.flatMap(s => s.links)

export { type SidebarSection }
