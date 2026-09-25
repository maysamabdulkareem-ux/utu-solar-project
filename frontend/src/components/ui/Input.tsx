import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { Field, fieldBoxClass } from './Field';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  /** Unit or currency rendered inside the field, after the value. */
  suffix?: string;
  /** Fixed text before the value, e.g. a country code. */
  prefix?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
};

/**
 * Text field with label, optional prefix/suffix and a help/error slot.
 *
 * The error state adds an icon and a message — a red border on its own would
 * fail both WCAG 1.4.1 and anyone skim-reading the form. `aria-describedby`
 * points at whichever of hint/error is live, and `aria-invalid` flips with it.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, prefix, suffix, hint, error, optional, optionalLabel, id, className, disabled, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hasError = Boolean(error);

  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      optionalLabel={optionalLabel}
      disabled={disabled}
      className={className}
    >
      <div
        className={cn(
          fieldBoxClass(hasError, disabled),
          'flex items-center gap-2.5 p-0 focus-within:border-[var(--focus-ring)] focus-within:ring-2 focus-within:ring-[rgba(77,92,134,0.22)]',
        )}
      >
        {prefix && (
          <span className="ps-4 text-label text-content-tertiary" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hint || error ? `${inputId}-message` : undefined}
          className={cn(
            'w-full min-w-0 bg-transparent py-3 text-body text-content-primary outline-none',
            'placeholder:text-content-tertiary disabled:text-content-disabled',
            prefix ? 'ps-0' : 'ps-4',
            suffix ? 'pe-0' : 'pe-4',
          )}
          {...rest}
        />
        {suffix && (
          <span className="pe-4 text-label text-content-tertiary" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
});
