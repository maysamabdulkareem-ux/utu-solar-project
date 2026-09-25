import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';

/**
 * Shared label / hint / error frame for every form control.
 *
 * Keeping this in one place is what stops the error treatment drifting between
 * a text input and a select: the message, the icon and the `aria-describedby`
 * wiring are written once.
 */
export function Field({
  id,
  label,
  hint,
  error,
  optional,
  optionalLabel,
  disabled,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const hasError = Boolean(error);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'flex items-center gap-2 text-label',
          disabled ? 'text-content-disabled' : 'text-content-secondary',
        )}
      >
        {label}
        {optional && optionalLabel && (
          <span className="text-label-sm font-normal text-content-tertiary">{optionalLabel}</span>
        )}
      </label>

      {children}

      {(hint || error) && (
        <p
          id={`${id}-message`}
          role={hasError ? 'alert' : undefined}
          className={cn(
            'flex items-start gap-1.5 text-body-sm',
            hasError ? 'text-[var(--status-danger)]' : 'text-content-tertiary',
          )}
        >
          {hasError && <Icon name="alert" size={16} className="mt-0.5 shrink-0" />}
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/** Shared box styling for inputs and selects, so both sit on the same grid. */
export function fieldBoxClass(hasError: boolean, disabled?: boolean) {
  return cn(
    'w-full rounded-md border-[1.5px] px-4 py-3 text-body text-content-primary transition-colors',
    'outline-none placeholder:text-content-tertiary',
    'focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[rgba(77,92,134,0.22)]',
    disabled
      ? 'cursor-not-allowed border-line-subtle bg-bg-subtle text-content-disabled'
      : 'bg-bg-surface',
    hasError ? 'border-[var(--status-danger)]' : !disabled && 'border-line',
  );
}
