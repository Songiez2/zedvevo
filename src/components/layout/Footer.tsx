import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-brand font-bold text-lg">Zed<span className="text-text-primary">Vevo</span></span>
            <p className="mt-3 text-sm text-text-muted leading-relaxed">
              Zambia's digital entertainment platform. Music, videos, events, and more.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Explore</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li><Link to="/music" className="hover:text-text-primary transition-colors">Music</Link></li>
              <li><Link to="/videos" className="hover:text-text-primary transition-colors">Videos</Link></li>
              <li><Link to="/store" className="hover:text-text-primary transition-colors">Store</Link></li>
              <li><Link to="/events" className="hover:text-text-primary transition-colors">Events</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Account</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li><Link to="/register" className="hover:text-text-primary transition-colors">Sign Up</Link></li>
              <li><Link to="/login" className="hover:text-text-primary transition-colors">Sign In</Link></li>
              <li><Link to="/become-artist" className="hover:text-text-primary transition-colors">Become an Artist</Link></li>
              <li><Link to="/library" className="hover:text-text-primary transition-colors">My Library</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Legal</h4>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li><span className="cursor-default">Privacy Policy</span></li>
              <li><span className="cursor-default">Terms of Service</span></li>
              <li><span className="cursor-default">Cookie Policy</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-muted">© {new Date().getFullYear()} ZedVevo. All rights reserved.</p>
          <p className="text-xs text-text-muted">Made with ♥ in Zambia</p>
        </div>
      </div>
    </footer>
  )
}
