import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from './ui/Button';
import { IconHome, IconLibrary, IconMoon, IconSearch, IconSun } from './icons';

// Slim translucent topbar. All nav is icon+label, using a single monochrome
// color scale. Active link is indicated with a filled accent dot only.
export function TopBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (document.documentElement.dataset.theme as 'dark' | 'light') || 'dark'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('bratan.theme', theme);
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem('bratan.theme');
    if (saved === 'light' || saved === 'dark') setTheme(saved);
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    navigate(`/search/${encodeURIComponent(query)}`);
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 border-b border-border-base bg-bg-base/70 backdrop-blur-xl"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 10px)',
        paddingLeft: 'max(env(safe-area-inset-left), 16px)',
        paddingRight: 'max(env(safe-area-inset-right), 16px)',
        paddingBottom: 10,
      }}
    >
      <NavLink to="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <span className="text-fg-base">БРАТАН</span>
        <span className="brand-dot" />
        <span className="text-fg-muted text-sm font-normal">музончик</span>
      </NavLink>

      <nav className="hidden md:flex items-center gap-1 ml-4">
        <NavItem to="/" icon={<IconHome size={18} />}>Главная</NavItem>
        <NavItem to="/library" icon={<IconLibrary size={18} />}>Библиотека</NavItem>
      </nav>

      <form onSubmit={onSubmit} className="flex-1 max-w-xl mx-auto flex items-center">
        <label className="relative w-full">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск трека, альбома, артиста"
            className="w-full h-10 pl-10 pr-3 rounded-md bg-bg-overlay border border-border-base text-sm text-fg-base placeholder:text-fg-subtle focus:outline-none focus:border-border-strong"
          />
        </label>
      </form>

      <Button
        variant="icon"
        size="md"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label="Сменить тему"
      >
        {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      </Button>
    </header>
  );
}

function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'inline-flex items-center gap-2 h-9 px-3 rounded-md text-sm transition-colors',
          isActive
            ? 'text-fg-base bg-bg-overlay'
            : 'text-fg-muted hover:text-fg-base hover:bg-bg-overlay',
        ].join(' ')
      }
      end
    >
      {icon}
      {children}
    </NavLink>
  );
}
