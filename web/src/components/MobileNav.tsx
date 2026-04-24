import { NavLink } from 'react-router-dom';
import { Home, Library, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

// Bottom tab bar for mobile. Sits above the mini-player on smaller
// viewports; on lg+ we render the Sidebar instead so this component
// returns null.
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
        <Tab to="/" icon={<Home size={18} />} label="Главная" end />
        <Tab to="/search" icon={<Search size={18} />} label="Поиск" />
        <Tab to="/library" icon={<Library size={18} />} label="Библиотека" />
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
          'transition-colors',
          isActive ? 'text-foreground' : 'text-muted-foreground',
        )
      }
    >
      <span aria-hidden>{icon}</span>
      {label}
    </NavLink>
  );
}
