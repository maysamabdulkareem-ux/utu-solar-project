import { useId, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { Field, fieldBoxClass } from './Field';

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  hint?: string;
  error?: string;
};

/**
 * Native `<select>`, styled.
 *
 * Deliberately not a custom listbox: on a phone the native picker is faster,
 * searchable by keystroke, and already localised — and the governorate list is
 * eighteen items a person scans, not a combobox they need to filter.
 */
export function Select({
  label,
  options,
  placeholder,
  hint,
  error,
  id,
  className,
  disabled,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const hasError = Boolean(error);

  return (
    <Field
      id={selectId}
      label={label}
      hint={hint}
      error={error}
      disabled={disabled}
      className={className}
    >
      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={hint || error ? `${selectId}-message` : undefined}
          className={cn(fieldBoxClass(hasError, disabled), 'appearance-none pe-11')}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron-down"
          size={18}
          className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-content-tertiary"
        />
      </div>
    </Field>
  );
}
