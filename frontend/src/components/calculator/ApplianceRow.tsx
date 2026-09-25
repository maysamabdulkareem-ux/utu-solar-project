import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { Stepper } from './Stepper';
import { applianceDailyWh } from './useSolarEstimate';
import { fmt, useLanguage } from '../../i18n/LanguageProvider';
import type { Appliance } from '../../data/content';

/**
 * One electrical load.
 *
 * Cause and effect stay on one line: the steppers on the reading-start side,
 * the resulting daily energy at the end, so changing hours visibly moves the
 * number beside it rather than only the totals further down.
 */
export function ApplianceRow({
  appliance,
  active,
  onChange,
  onFocus,
}: {
  appliance: Appliance;
  active: boolean;
  onChange: (next: Appliance) => void;
  onFocus: () => void;
}) {
  const { t, pick } = useLanguage();
  const daily = applianceDailyWh(appliance);
  const name = pick(appliance.name);

  const unitsOf = t('row.unitsOf', { n: name });
  const hoursOf = t('row.hoursOf', { n: name });

  return (
    <li
      onFocusCapture={onFocus}
      onMouseEnter={onFocus}
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-[12px] border p-4 transition-colors',
        active
          ? 'border-[1.5px] border-line-brand bg-bg-panel-raised'
          : 'border-line-on-dark bg-bg-panel-deep',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-bg-panel-raised',
          active ? 'text-solar-300' : 'text-dusk-200',
        )}
      >
        <Icon name={appliance.icon} size={20} />
      </span>

      <div className="min-w-[8rem] flex-1">
        <p className="text-label text-content-on-dark">{name}</p>
        <p className="text-label-sm text-content-on-dark-muted">
          <span className="numeric">{fmt.int(appliance.watts)}</span> {t('row.each')}
        </p>
      </div>

      <Stepper
        label={t('row.units')}
        fullLabel={unitsOf}
        value={appliance.units}
        min={0}
        max={40}
        decreaseLabel={t('row.decrease', { n: unitsOf })}
        increaseLabel={t('row.increase', { n: unitsOf })}
        onChange={(units) => onChange({ ...appliance, units })}
      />

      <Stepper
        label={t('row.hours')}
        fullLabel={hoursOf}
        value={appliance.hours}
        min={0}
        max={24}
        decreaseLabel={t('row.decrease', { n: hoursOf })}
        increaseLabel={t('row.increase', { n: hoursOf })}
        onChange={(hours) => onChange({ ...appliance, hours })}
      />

      <div className="w-24 shrink-0 text-end">
        <p className={cn('numeric text-label', active ? 'text-solar-300' : 'text-content-on-dark')}>
          {fmt.int(daily)} Wh
        </p>
        <p className="text-label-sm text-content-on-dark-muted">{t('row.perDay')}</p>
      </div>
    </li>
  );
}
