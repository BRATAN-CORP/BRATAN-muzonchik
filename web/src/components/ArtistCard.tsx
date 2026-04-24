import type { ArtistSet } from '@/lib/types';
import { MediaCard } from './MediaCard';

interface ArtistCardProps {
  artist: ArtistSet;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  return (
    <MediaCard
      to={`/artist/td/${encodeURIComponent(artist.id)}`}
      title={artist.name}
      subtitle="Артист"
      thumb={artist.thumb}
      rounded="full"
    />
  );
}
