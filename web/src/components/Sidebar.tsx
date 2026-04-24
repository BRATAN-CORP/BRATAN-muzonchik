import { NavLink, Link } from 'react-router-dom';
import { Home, Library, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SidebarProps {
  className?: string;
}

// Desktop-only navigation rail. Strict hairline composition — no
// gradient halo on the brand mark.
export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col gap-2 w-[232px] shrink-0 h-full',
        'bg-sidebar text-sidebar-foreground border-r border-sidebar-border',
        'p-3',
        className,
      )}
    >
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-2 py-3 text-[14px] font-semibold tracking-tight hover:text-accent transition-colors duration-150"
      >
        <span
          aria-hidden
          className="inline-block size-[14px] rounded-[4px] bg-accent"
        />
        <span>БРАТАН-музончик</span>
      </Link>

      <nav className="mt-1 flex flex-col gap-[2px]" aria-label="Основная навигация">
        <NavItem to="/" icon={<Home size={14} strokeWidth={1.5} />} label="Главная" end />
        <NavItem to="/search" icon={<Search size={14} strokeWidth={1.5} />} label="Поиск" />
        <NavItem to="/library" icon={<Library size={14} strokeWidth={1.5} />} label="Библиотека" />
      </nav>

      <div className="mt-auto px-2 pb-2 text-[11px] text-muted-foreground leading-4">
        Один акцент, один шрифт, один дизайн-язык.
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
          'group flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[12px] transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          isActive
            ? 'bg-[rgba(60,130,255,0.12)] text-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-[rgba(255,255,255,0.04)]',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span aria-hidden className={cn(isActive ? 'text-accent' : '')}>
            {icon}
          </span>
          <span aria-current={isActive ? 'page' : undefined}>{label}</span>
        </>
      )}
    </NavLink>
  );
}
