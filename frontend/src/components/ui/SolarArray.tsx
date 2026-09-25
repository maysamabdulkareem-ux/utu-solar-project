import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'home' | 'commercial' | 'hybrid';

const TONES: Record<Tone, { glow: string; edge: string }> = {
  home: { glow: '#f7c55f', edge: '#d45633' },
  commercial: { glow: '#ef9a7c', edge: '#4d5c86' },
  hybrid: { glow: '#f2ac2e', edge: '#8a321d' },
};

/**
 * The fallback image treatment: a dark photovoltaic lattice with a sunset
 * reflection across it. Drawn in CSS, so a project that has no photograph yet
 * still gets a finished-looking card instead of an empty box — and it never
 * ships the wrong roof.
 *
 * Every layer is positioned with physical properties, so the composition holds
 * in both languages while overlaid UI still mirrors with the page.
 */
export function SolarArray({
  tone = 'home',
  className,
  label,
  children,
}: {
  tone?: Tone;
  className?: string;
  /** Accessible name. Omit for a purely decorative instance. */
  label?: string;
  children?: ReactNode;
}) {
  const { glow, edge } = TONES[tone];

  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('relative overflow-hidden bg-panel-900', className)}
      style={{ backgroundImage: 'linear-gradient(150deg, #24404e 0%, #14222b 55%, #0a0f13 100%)' }}
    >
      {/* sunset glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/2 left-1/5 h-[150%] w-[150%]"
        style={{
          background: `radial-gradient(closest-side, ${glow}9e 0%, ${edge}38 55%, transparent 100%)`,
        }}
      />
      {/* panel lattice */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(221,226,239,0.13) 0 1px, transparent 1px 22px),' +
            'repeating-linear-gradient(to right, rgba(221,226,239,0.17) 0 1px, transparent 1px 46px)',
        }}
      />
      {/* specular reflection band */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-1/5 top-[8%] h-[34%] w-[140%] -rotate-[8deg]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,248,234,0.15), transparent)',
        }}
      />
      {children}
    </div>
  );
}
