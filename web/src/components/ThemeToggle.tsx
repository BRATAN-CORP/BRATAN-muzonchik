import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

type Theme = 'light' | 'dark';

const LS_KEY = 'bratan.theme';

// Reads the theme set by the early script in index.html so we don't flash,
// then mirrors the user's choice back to <html data-theme> + localStorage.
// The meta[name="theme-color"] tag is also updated so mobile chrome bars
// track the active surface.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === 'undefined') return 'dark';
    const attr = document.documentElement.getAttribute('data-theme');
    return attr === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(LS_KEY, theme);
    } catch {
      /* ignore quota errors */
    }
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#0a0a0b');
  }, [theme]);

  const isLight = theme === 'light';
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isLight ? 'Тёмная тема' : 'Светлая тема'}
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
    >
      {isLight ? <Moon size={16} /> : <Sun size={16} />}
    </Button>
  );
}
