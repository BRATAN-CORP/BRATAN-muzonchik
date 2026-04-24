import { NavLink, Link } from 'react-router-dom';
import { Home, Library, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SidebarProps {
  className?: string;
}

// Desktop-only navigation rail. On mobile we hide this and use the
// bottom MobileNav instead — so we don't try to combine two navigations
// into a single "responsive" component that breaks in the middle.
export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col gap-2 w-[248px] shrink-0 h-full',
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
        'p-4',
        className,
      )}
    >
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-2 py-3 text-[15px] font-semibold tracking-tight"
      >
        <span
          aria-hidden
          className="inline-flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground shadow-soft"
        >
          <span className="text-[11px] font-bold">БР</span>
        </span>
        <span>БРАТАН<span className="brand-dot" aria-hidden /></span>
      </Link>

      <nav className="mt-2 flex flex-col gap-0.5" aria-label="Основная навигация">
        <NavItem to="/" icon={<Home size={16} />} label="Главная" end />
        <NavItem to="/search" icon={<Search size={16} />} label="Поиск" />
        <NavItem to="/library" icon={<Library size={16} />} label="Библиотека" />
      </nav>

      <div className="mt-auto px-2 pb-2 text-[11px] text-muted-foreground">
        Минималистичный плеер. Один дизайн-язык на всех поверхностях.
      </div>
    </aside>
  );
}

function NavItem({
  to,
  icon,
  label,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
          isActive
            ? 'bg-secondary text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span aria-hidden>{icon}</span>
          <span aria-current={isActive ? 'page' : undefined}>{label}</span>
        </>
      )}
    </NavLink>
  );
}
