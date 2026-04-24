import { NavLink } from 'react-router-dom';
import { Home, Library, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

// Bottom tab bar for mobile. Thin glass strip with Solar-weight
// lucide-react icons (single stroke, 1.5 weight) — per DESIGN.md.
export function MobileNav() {
  return (
    <nav
      aria-label="Основная навигация"
      className={cn(
        'lg:hidden fixed left-0 right-0 bottom-0 z-30',
        'glass border-t border-border',
        'pb-[max(env(safe-area-inset-bottom),6px)]',
      )}
    >
      <div className="mx-auto max-w-xl grid grid-cols-3">
        <Tab to="/" icon={<Home size={16} strokeWidth={1.5} />} label="Главная" end />
        <Tab to="/search" icon={<Search size={16} strokeWidth={1.5} />} label="Поиск" />
        <Tab to="/library" icon={<Library size={16} strokeWidth={1.5} />} label="Библиотека" />
      </div>
    </nav>
  );
}

function Tab({
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
          'flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium',
          'transition-colors duration-150',
          isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span aria-hidden className={cn(isActive && 'text-accent')}>
            {icon}
          </span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
