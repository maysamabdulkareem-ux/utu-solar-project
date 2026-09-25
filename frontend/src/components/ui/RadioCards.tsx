import { useId } from 'react';
import { cn } from '../../lib/cn';
import { Icon, type IconName } from '../icons/Icon';

export type RadioCardOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
};

/**
 * A radio group rendered as selectable cards.
 *
 * Real radios underneath, wrapped in a `<fieldset>` with a `<legend>`, so
 * arrow-key navigation, form semantics and screen-reader grouping all come for
 * free. Selection is signalled by border, background AND a check mark — not by
 * colour alone.
 */
export function RadioCards<T extends string>({
  legend,
  name,
  value,
  options,
  columns = 2,
  error,
  onChange,
  className,
}: {
  legend: string;
  name: string;
  value: T | '';
  options: RadioCardOption<T>[];
  columns?: 2 | 3 | 4;
  error?: string;
  onChange: (next: T) => void;
  className?: string;
}) {
  const id = useId();
  const hasError = Boolean(error);

  return (
    <fieldset className={cn('flex flex-col gap-2.5', className)}>
      <legend className="mb-1 text-label text-content-secondary">{legend}</legend>

      <div
        className={cn(
          'grid gap-2.5',
          columns === 2 && 'sm:grid-cols-2',
          columns === 3 && 'sm:grid-cols-3',
          columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        )}
      >
        {options.map((o) => {
          const checked = value === o.value;
          const optionId = `${id}-${o.value}`;
          return (
            <label
              key={o.value}
              htmlFor={optionId}
              className={cn(
                'relative flex cursor-pointer gap-3 rounded-lg border-[1.5px] p-4 transition-colors',
                'focus-within:border-[var(--focus-ring)] focus-within:ring-2 focus-within:ring-[rgba(77,92,134,0.22)]',
                checked
                  ? 'border-line-brand bg-[var(--brand-subtle)]'
                  : hasError
                    ? 'border-[var(--status-danger)] bg-bg-surface hover:border-line-strong'
                    : 'border-line bg-bg-surface hover:border-line-strong',
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />

              {o.icon && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-[10px]',
                    checked
                      ? 'bg-[var(--brand-primary)] text-content-on-brand'
                      : 'bg-bg-subtle text-content-tertiary',
                  )}
                >
                  <Icon name={o.icon} size={18} />
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block text-label text-content-primary">{o.label}</span>
                {o.description && (
                  <span className="mt-0.5 block text-body-sm text-content-secondary">
                    {o.description}
                  </span>
                )}
              </span>

              {/* Shape as well as colour, so selection survives greyscale. */}
              <span
                aria-hidden="true"
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] transition-colors',
                  checked
                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-content-on-brand'
                    : 'border-line',
                )}
              >
                {checked && <Icon name="check" size={12} strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-body-sm text-[var(--status-danger)]">
          <Icon name="alert" size={16} className="shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
