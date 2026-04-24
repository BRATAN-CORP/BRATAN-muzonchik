import { NavLink } from 'react-router-dom'
import { Home, Search, Library, Headphones } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/library', icon: Library, label: 'Library' },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 h-full bg-card/50 border-r border-border">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20">
          <Headphones className="w-4.5 h-4.5 text-primary" />
        </div>
        <span className="text-base font-extrabold tracking-tight uppercase">
          BRATAN<span className="text-primary">-music</span>
        </span>
      </div>

      <nav className="flex flex-col gap-1 px-3 mt-2" aria-label="Main navigation">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
              )
            }
            aria-label={label}
          >
            <Icon className="w-4.5 h-4.5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto px-4 py-4">
        <div className="text-xs text-muted-foreground/60 text-center">
          Tidal + SoundCloud + YouTube
        </div>
      </div>
    </aside>
  )
}
