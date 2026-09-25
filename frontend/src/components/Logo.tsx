import { cn } from '../lib/cn';

/**
 * Utu lockup — named for the Sumerian sun god.
 *
 * The mark is a sunset disc rising over two photovoltaic bars — the same idea
 * as the page's image treatment, reduced to 36px. The disc carries the brand
 * colour on its own, so the wordmark stays a single quiet word beside it.
 *
 * Three letters need air: the display tracking used elsewhere is negative,
 * which would cramp a name this short, so this one opens up slightly instead.
 *
 * `brand-lockup` pins it to LTR and the Latin face: a brand name is not
 * translated and not mirrored, in either language.
 */
export function Logo({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <span className={cn('brand-lockup inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'relative block h-9 w-9 shrink-0 overflow-hidden rounded-[11px]',
          onDark && 'ring-1 ring-panel-500',
        )}
        style={{ backgroundImage: 'linear-gradient(145deg, #1d303b 0%, #0a0f13 100%)' }}
      >
        <span
          className="absolute block h-[15px] w-[15px] rounded-full"
          style={{
            left: 10.5,
            top: 5.5,
            backgroundImage: 'linear-gradient(180deg, #f7c55f 0%, #e5754f 100%)',
          }}
        />
        <span
          className="absolute block h-[3px] rounded-sm bg-solar-400"
          style={{ left: 6.5, top: 23.5, width: 23 }}
        />
        <span
          className="absolute block h-[3px] rounded-sm"
          style={{ left: 10, top: 28.5, width: 16, backgroundColor: 'rgba(242,172,46,0.45)' }}
        />
      </span>
      <span
        className={cn(
          'text-[1.25rem] font-semibold leading-7 tracking-[0.015em]',
          onDark ? 'text-content-on-dark' : 'text-content-primary',
        )}
      >
        Utu
      </span>
    </span>
  );
}
