import { useId } from 'react';
import { Icon } from '../icons/Icon';

/**
 * Numeric stepper for the calculator.
 *
 * Both buttons are 36px so they clear the 24px minimum comfortably and sit
 * close to the 44px recommendation once the row's padding is counted. The
 * value sits in a polite live region so a screen reader hears the new number
 * without focus moving.
 *
 * Minus stays on the reading-start side in both directions — the row mirrors
 * with the page, so the control does too.
 */
export function Stepper({
  label,
  fullLabel,
  value,
  min = 0,
  max = 99,
  decreaseLabel,
  increaseLabel,
  onChange,
}: {
  /** Short visible caption, e.g. "Units". */
  label: string;
  /** Unambiguous name, e.g. "Air Conditioner units". Used for the live region. */
  fullLabel: string;
  value: number;
  min?: number;
  max?: number;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (next: number) => void;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className="flex flex-col gap-1.5">
      <span id={labelId} className="text-label-sm text-content-on-dark-muted">
        {label}
      </span>
      <span className="sr-only" id={`${id}-full`}>
        {fullLabel}
      </span>
      <div className="flex items-center rounded-[9px] border border-line-on-dark bg-bg-panel-raised">
        <button
          type="button"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label={decreaseLabel}
          className="grid h-9 w-9 place-items-center rounded-s-[9px] text-content-on-dark-muted transition-colors hover:text-content-on-dark disabled:opacity-40"
        >
          <Icon name="minus" size={16} />
        </button>
        <span
          role="status"
          aria-live="polite"
          aria-labelledby={`${id}-full`}
          className="numeric w-10 text-center text-label text-content-on-dark"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label={increaseLabel}
          className="grid h-9 w-9 place-items-center rounded-e-[9px] text-content-on-dark-muted transition-colors hover:text-content-on-dark disabled:opacity-40"
        >
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  );
}
