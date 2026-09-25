import { cn } from '../../lib/cn';
import { Icon, type IconName } from '../icons/Icon';

/**
 * One output of the calculator.
 *
 * The unit sits beside the number rather than inside it, so the figure stays
 * scannable, and `numeric` keeps the digits left-to-right and column-aligned
 * even inside an Arabic sentence.
 */
export function ResultStat({
  icon,
  label,
  value,
  unit,
  note,
  emphasis = false,
}: {
  icon: IconName;
  label: string;
  value: string;
  unit: string;
  note: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-5',
        emphasis
          ? 'border-[1.5px] border-line-brand bg-bg-panel-raised'
          : 'border-line-on-dark bg-bg-panel-deep',
      )}
    >
      <p className="flex items-center gap-2.5 text-label-sm text-content-on-dark-muted">
        <Icon
          name={icon}
          size={18}
          className={cn('shrink-0', emphasis ? 'text-solar-300' : 'text-dusk-200')}
        />
        {label}
      </p>
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'numeric text-data-xl',
            emphasis ? 'text-solar-300' : 'text-content-on-dark',
          )}
        >
          {value}
        </span>
        <span className="text-label text-content-on-dark-muted">{unit}</span>
      </p>
      <p className="text-label-sm text-content-on-dark-muted">{note}</p>
    </div>
  );
}
