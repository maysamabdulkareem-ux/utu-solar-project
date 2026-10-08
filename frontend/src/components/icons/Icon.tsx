import type { ReactElement, SVGProps } from 'react';

/**
 * One 24px stroke set at 1.75 weight, drawn on the same grid as the Figma
 * icon sheet. Icons inherit `currentColor`, so colour comes from the parent's
 * text token — never from a prop with a hex in it.
 *
 * Decorative by default (aria-hidden). Pass a `title` when the icon is the
 * only label an element has.
 */
export type IconName =
  | 'sun'
  | 'solar-panel'
  | 'battery'
  | 'home'
  | 'building'
  | 'calculator'
  | 'shield-check'
  | 'check'
  | 'clock'
  | 'x-mark'
  | 'star'
  | 'map-pin'
  | 'arrow-right'
  | 'chevron-down'
  | 'menu'
  | 'zap'
  | 'air-conditioner'
  | 'fridge'
  | 'tv'
  | 'lightbulb'
  | 'water-pump'
  | 'washing-machine'
  | 'users'
  | 'award'
  | 'wrench'
  | 'phone'
  | 'mail'
  | 'trending-up'
  | 'file-check'
  | 'search'
  | 'alert'
  | 'plus'
  | 'minus'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'x-social'
  | 'eye'
  | 'eye-off'
  | 'bell';

const PATHS: Record<IconName, ReactElement> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  'solar-panel': (
    <>
      <rect x="3" y="4" width="18" height="11" rx="1.5" />
      <path d="M3 8.5h18M3 11.5h18M9 4v11M15 4v11M12 15v5M8 20h8" />
    </>
  ),
  battery: (
    <>
      <rect x="2" y="7" width="16" height="10" rx="2.5" />
      <path d="M21.5 10.5v3M6 10.5v3M9.5 10.5v3M13 10.5v3" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.2 9.6V20h13.6V9.6" />
      <path d="M9.6 20v-5.6h4.8V20" />
    </>
  ),
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-3.2h4V21" />
    </>
  ),
  calculator: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2.5" />
      <rect x="7.2" y="5.2" width="9.6" height="3.8" rx="1" />
      <path d="M8.2 13h.01M12 13h.01M15.8 13h.01M8.2 17h.01M12 17h.01M15.8 17h.01" />
    </>
  ),
  'shield-check': (
    <>
      <path d="M12 2.5 20 6v6c0 4.5-3.2 8.3-8 9.5C7.2 20.3 4 16.5 4 12V6l8-3.5Z" />
      <path d="m8.6 12 2.4 2.4 4.4-4.4" />
    </>
  ),
  check: <path d="m4.8 12.6 4.8 4.8L19.2 6.6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.4l3.4 2" />
    </>
  ),
  'x-mark': <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  star: (
    <path
      d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  'map-pin': (
    <>
      <path d="M20 10.5c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10.5" r="2.8" />
    </>
  ),
  'arrow-right': <path d="M4 12h15M13 6l6 6-6 6" />,
  'chevron-down': <path d="m6 9.5 6 6 6-6" />,
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />,
  zap: <path d="M13.5 2 4 13.5h6.2L10 22l9.5-11.5H13.2L13.5 2Z" />,
  'air-conditioner': (
    <>
      <rect x="2.5" y="4.5" width="19" height="7.5" rx="2" />
      <path d="M6 8.5h12" />
      <path d="M7 15c0 1.4 1 1.9 1 3.3M12 15c0 1.9 1 2.4 1 3.8M17 15c0 1.4 1 1.9 1 3.3" />
    </>
  ),
  fridge: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M6.5 10h11M9.5 6v2M9.5 13v2.5" />
    </>
  ),
  tv: (
    <>
      <rect x="2.5" y="4.5" width="19" height="12.5" rx="2" />
      <path d="M8.5 21h7M12 17v4" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9.2 17.6h5.6M10.2 21h3.6" />
      <path d="M12 3a6 6 0 0 0-3.4 10.9c.6.5.9 1.1.9 1.7h5c0-.6.3-1.2.9-1.7A6 6 0 0 0 12 3Z" />
    </>
  ),
  'water-pump': <path d="M12 3s6 6.4 6 10.4A6 6 0 0 1 6 13.4C6 9.4 12 3 12 3Z" />,
  'washing-machine': (
    <>
      <rect x="4" y="2.5" width="16" height="19" rx="2.5" />
      <circle cx="12" cy="14" r="4.6" />
      <path d="M7.5 6h1.5M11.5 6h5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.6 20c0-3.5 2.8-5.9 6.4-5.9s6.4 2.4 6.4 5.9" />
      <path d="M16.4 5.2a3.5 3.5 0 0 1 0 6.6M18 14.4c2 .7 3.4 2.6 3.4 5.6" />
    </>
  ),
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="m8.6 14.4-1.4 7.1L12 19l4.8 2.5-1.4-7.1" />
    </>
  ),
  wrench: (
    <path d="M14.5 3.5a5.5 5.5 0 0 0-4.9 8L3 18.1 5.9 21l6.6-6.6a5.5 5.5 0 0 0 6.9-7.2L16.2 10 14 7.8l3.6-3.6a5.4 5.4 0 0 0-3.1-.7Z" />
  ),
  phone: (
    <path d="M6 3.2h2.8l2 4.8-2.2 1.4a12 12 0 0 0 5.8 5.8l1.4-2.2 4.8 2v2.8a2 2 0 0 1-2.2 2C10.4 19.2 4.8 13.6 4 5.4a2 2 0 0 1 2-2.2Z" />
  ),
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.6 7.2 8.4 5.8 8.4-5.8" />
    </>
  ),
  'trending-up': (
    <>
      <path d="M3 17.2 9.5 10.7l4 4L21 7.2" />
      <path d="M15.2 7.2H21v5.8" />
    </>
  ),
  'file-check': (
    <>
      <path d="M14 3H7.2A2.2 2.2 0 0 0 5 5.2v13.6A2.2 2.2 0 0 0 7.2 21h9.6a2.2 2.2 0 0 0 2.2-2.2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="m9.6 14.6 1.8 1.8 3.4-3.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.4 16.4 4.1 4.1" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.4v5.2M12 16.3v.3" />
    </>
  ),
  plus: <path d="M12 6v12M6 12h12" />,
  minus: <path d="M6 12h12" />,
  facebook: (
    <path
      d="M13.8 8.6h2.6V5.6h-2.6c-2 0-3.6 1.6-3.6 3.6v1.9H7.8v3h2.4V21h3v-6.9h2.4l.6-3h-3V9.5c0-.5.3-.9.6-.9Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" />
      <path d="M8 10.6V17M12 17v-3.5c0-1.4.9-2.4 2.2-2.4s2.3 1 2.3 2.4V17" />
      <circle cx="8" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  'x-social': <path d="M4.5 4.5 19.5 19.5M19.5 4.5 4.5 19.5" />,
  eye: (
    <>
      <path d="M2.2 12s3.4-6.5 9.8-6.5 9.8 6.5 9.8 6.5-3.4 6.5-9.8 6.5S2.2 12 2.2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M3 3 21 21M10.6 10.7a2 2 0 0 0 2.7 2.7" />
      <path d="M9.9 5.7A10.9 10.9 0 0 1 12 5.5c6.4 0 9.8 6.5 9.8 6.5a15 15 0 0 1-3.1 3.8M6.2 6.3C3.6 8 2.2 12 2.2 12s3.4 6.5 9.8 6.5c1 0 2-.2 2.9-.5" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </>
  ),
};

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  /** Accessible name. Omit for decorative icons. */
  title?: string;
};

export function Icon({ name, size = 20, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
