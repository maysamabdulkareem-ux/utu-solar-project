import { useId } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';

/**
 * Checkbox with an optional description.
 *
 * The box is a real `<input type="checkbox">` kept visually hidden, with the
 * drawn box mirroring its state — so keyboard, form submission and assistive
 * tech all behave natively while the tick matches the design system.
 */
export function Checkbox({
  label,
  description,
  checked,
  onChange,
  className,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md p-1',
        'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus-ring)]',
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-colors',
          checked
            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-content-on-brand'
            : 'border-line bg-bg-surface',
        )}
      >
        {checked && <Icon name="check" size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-label text-content-primary">{label}</span>
        {description && (
          <span className="mt-0.5 block text-body-sm text-content-secondary">{description}</span>
        )}
      </span>
    </label>
  );
}
