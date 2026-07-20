import { Link, useLocation } from 'react-router-dom'
import { Home, Music, Video, ShoppingBag, Library } from 'lucide-react'
import { cn } from '@/utils'
import { MOBILE_NAV } from '@/constants'
import type { LucideIcon } from 'lucide-react'

export function MobileNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-deep-black/95 backdrop-blur supports-[backdrop-filter]:bg-deep-black/80 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon as LucideIcon
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors',
                isActive ? 'text-electric' : 'text-gray-400 hover:text-white'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'fill-electric/20')} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
