import { NavLink } from 'react-router-dom'
import { Home, Search, Library } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/library', icon: Library, label: 'Library' },
]

export function MobileNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden items-center justify-around bg-card/95 backdrop-blur-md border-t border-border py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
          aria-label={label}
        >
          <Icon className="w-5 h-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
