import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Small neutral tag — service names, project types, filters. */
export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'onDark';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-label-sm',
        tone === 'neutral' && 'bg-bg-subtle text-content-secondary',
        tone === 'brand' && 'bg-[var(--brand-subtle)] text-content-brand',
        tone === 'onDark' && 'bg-bg-panel-raised text-content-on-dark-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}
