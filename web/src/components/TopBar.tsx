import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '@/lib/cn';

interface TopBarProps {
  className?: string;
}

// Thin header with back/forward + theme. Matches the Apple Music /
// Yandex Music feel: nav controls on the left, account affordance on
// the right. We don't render a search input here — /search owns it.
export function TopBar({ className }: TopBarProps) {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex items-center justify-between gap-3',
        'glass border-b border-border',
        'h-14 px-4 sm:px-6',
        className,
      )}
    >
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Назад"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Вперёд"
          onClick={() => navigate(1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
      </div>
    </div>
  );
}
