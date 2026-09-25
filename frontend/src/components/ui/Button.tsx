import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { ctaHover } from '../../motion/animation';
import { useReducedMotion } from '../../motion/useReducedMotion';

type Variant = 'primary' | 'secondary' | 'ghost' | 'onDark';
type Size = 'md' | 'lg';

/**
 * framer-motion defines its own `onDrag*` / `onAnimation*` / `style` props
 * whose types clash with React's DOM equivalents, so those are dropped from
 * the passthrough. Everything else on a native <button> still works.
 */
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'style'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'
  | 'onDrop'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
>;

export type ButtonProps = NativeButtonProps & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Renders an arrow after the label. */
  trailingArrow?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
};

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-[var(--brand-primary)] text-content-on-brand hover:bg-[var(--brand-primary-hover)] active:bg-[var(--brand-primary-press)]',
  secondary:
    'bg-bg-surface text-content-primary border-[1.5px] border-line hover:border-line-strong',
  ghost: 'text-content-brand hover:bg-[var(--brand-subtle)]',
  // For deep-panel sections: an outline that reads on near-black.
  onDark:
    'text-content-on-dark border-[1.5px] border-line-on-dark hover:border-panel-400 hover:bg-bg-panel-raised',
};

const SIZE: Record<Size, string> = {
  md: 'text-label px-5 py-2.5 gap-2 rounded-md',
  lg: 'text-[1rem] leading-6 px-6 py-3.5 gap-2.5 rounded-md',
};

/**
 * The one button in the product.
 *
 * Accessibility notes:
 *  - `loading` keeps the label mounted, so the button never changes width
 *    mid-action and screen readers do not lose the accessible name.
 *  - `aria-busy` announces the pending state; the spinner is decorative.
 *  - Focus uses the global :focus-visible ring (dusk on light, solar inside
 *    `.on-dark`), so focus is never signalled by fill colour alone.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'lg',
    loading = false,
    trailingArrow = false,
    fullWidth = false,
    disabled,
    className,
    children,
    ...rest
  },
  ref,
) {
  const prefersReduced = useReducedMotion();
  const isDisabled = disabled || loading;
  const lift = !prefersReduced && !isDisabled && variant === 'primary';

  return (
    <motion.button
      ref={ref}
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      whileHover={lift ? ctaHover : undefined}
      whileTap={prefersReduced || isDisabled ? undefined : { scale: 0.985 }}
      className={cn(
        'inline-flex items-center justify-center font-semibold tracking-[-0.01em]',
        'select-none transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'disabled:bg-line-subtle disabled:text-content-disabled',
        VARIANT[variant],
        SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className={cn(
            'inline-block shrink-0 rounded-full border-2 border-current border-t-transparent',
            'motion-safe:animate-spin',
            size === 'lg' ? 'h-[18px] w-[18px]' : 'h-4 w-4',
          )}
        />
      )}
      <span>{children}</span>
      {/* The arrow points the way the reader is going, so it flips under RTL. */}
      {trailingArrow && !loading && (
        <Icon name="arrow-right" size={size === 'lg' ? 20 : 18} className="rtl:-scale-x-100" />
      )}
    </motion.button>
  );
});
