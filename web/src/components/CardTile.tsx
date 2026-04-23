import { Link } from 'react-router-dom';
import { Cover } from './Cover';

interface CardTileProps {
  to: string;
  title: string;
  subtitle?: string;
  thumb?: string;
  rounded?: 'md' | 'lg' | 'full';
}

export function CardTile({ to, title, subtitle, thumb, rounded = 'md' }: CardTileProps) {
  return (
    <Link
      to={to}
      className="group rounded-lg p-3 hover:bg-bg-overlay transition-colors"
    >
      <div className="aspect-square w-full">
        <Cover
          src={thumb}
          title={title}
          artist={subtitle}
          rounded={rounded}
          className="size-full shadow-soft group-hover:shadow-float transition-shadow"
        />
      </div>
      <div className="mt-3 min-w-0">
        <div className="truncate text-sm font-medium text-fg-base">{title}</div>
        {subtitle && <div className="truncate text-xs text-fg-muted">{subtitle}</div>}
      </div>
    </Link>
  );
}
