import { useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { Field, fieldBoxClass } from './Field';

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
};

export function Textarea({
  label,
  hint,
  error,
  optional,
  optionalLabel,
  id,
  className,
  disabled,
  rows = 4,
  ...rest
}: TextareaProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hasError = Boolean(error);

  return (
    <Field
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      optional={optional}
      optionalLabel={optionalLabel}
      disabled={disabled}
      className={className}
    >
      <textarea
        id={fieldId}
        rows={rows}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-describedby={hint || error ? `${fieldId}-message` : undefined}
        className={cn(fieldBoxClass(hasError, disabled), 'resize-y leading-relaxed')}
        {...rest}
      />
    </Field>
  );
}
