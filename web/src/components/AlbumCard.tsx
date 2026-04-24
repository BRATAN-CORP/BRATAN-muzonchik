import type { AlbumSet } from '@/lib/types';
import { MediaCard } from './MediaCard';

interface AlbumCardProps {
  album: AlbumSet;
  onPlay?: (album: AlbumSet) => void;
}

export function AlbumCard({ album, onPlay }: AlbumCardProps) {
  return (
    <MediaCard
      to={`/album/td/${encodeURIComponent(album.id)}`}
      title={album.title}
      subtitle={album.artist || undefined}
      thumb={album.thumb}
      rounded="md"
      onPlay={onPlay ? () => onPlay(album) : undefined}
      playAriaLabel={`Включить альбом ${album.title}`}
    />
  );
}
