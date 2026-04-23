// Single monochrome icon set — all icons are stroke-based SVGs that inherit
// `currentColor`. No external icon libraries are pulled in so the bundle
// stays small and no color drift is possible.

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const make = (d: React.ReactNode) =>
  function Icon({ size = 20, ...rest }: IconProps) {
    return (
      <svg width={size} height={size} {...defaults} {...rest}>
        {d}
      </svg>
    );
  };

export const IconPlay = make(
  <path d="M7 4.5v15l13-7.5-13-7.5z" fill="currentColor" stroke="none" />
);
export const IconPause = make(
  <>
    <rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor" stroke="none" />
  </>
);
export const IconPrev = make(
  <>
    <path d="M19 4.5v15L8 12l11-7.5z" fill="currentColor" stroke="none" />
    <line x1="5" y1="4" x2="5" y2="20" />
  </>
);
export const IconNext = make(
  <>
    <path d="M5 4.5v15L16 12 5 4.5z" fill="currentColor" stroke="none" />
    <line x1="19" y1="4" x2="19" y2="20" />
  </>
);
export const IconShuffle = make(
  <>
    <path d="M16 3h5v5" />
    <polyline points="21 3 4 20" />
    <path d="M21 16v5h-5" />
    <line x1="15" y1="15" x2="21" y2="21" />
    <line x1="4" y1="4" x2="9" y2="9" />
  </>
);
export const IconRepeat = make(
  <>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </>
);
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16.5" y2="16.5" />
  </>
);
export const IconHome = make(<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V11z" />);
export const IconLibrary = make(
  <>
    <line x1="6" y1="4" x2="6" y2="20" />
    <line x1="11" y1="4" x2="11" y2="20" />
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3z" />
  </>
);
export const IconClose = make(<path d="M6 6l12 12M18 6 6 18" />);
export const IconChevronDown = make(<polyline points="6 9 12 15 18 9" />);
export const IconMore = make(
  <>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </>
);
export const IconHeart = make(
  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
);
export const IconPlus = make(
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>
);
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5" />
  </>
);
export const IconMoon = make(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />);
export const IconVolume = make(
  <>
    <polygon points="11 4 6 9 3 9 3 15 6 15 11 20" fill="currentColor" stroke="none" />
    <path d="M16 8a5 5 0 0 1 0 8" />
    <path d="M19 5a9 9 0 0 1 0 14" />
  </>
);
export const IconSlider = make(
  <>
    <line x1="4" y1="7" x2="20" y2="7" />
    <circle cx="9" cy="7" r="2" fill="currentColor" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="15" cy="12" r="2" fill="currentColor" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <circle cx="12" cy="17" r="2" fill="currentColor" />
  </>
);
export const IconDownload = make(
  <>
    <path d="M12 3v12" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="4" y1="21" x2="20" y2="21" />
  </>
);
export const IconMaximize = make(
  <>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </>
);
