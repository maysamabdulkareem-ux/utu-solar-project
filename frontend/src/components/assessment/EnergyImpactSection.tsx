import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { fmt, useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';
import { PRICING_ASSUMPTIONS, type EnergyImpact } from '../../assessment/utuAssessment';

const MIX_COLOR = {
  grid: 'var(--chart-grid)',
  generator: 'var(--chart-generator)',
  solar: 'var(--chart-solar)',
} as const;

type MixSegment = { key: TranslationKey; pct: number; color: string };

/**
 * Typical energy mix today versus the selected option. Every projected
 * figure is labelled as an estimate and the assumptions are one click away.
 */
export function EnergyImpactSection({ impact }: { impact: EnergyImpact }) {
  const { t } = useLanguage();
  const [showAssumptions, setShowAssumptions] = useState(false);

  const currentSegments: MixSegment[] = [
    { key: 'as.impact.grid', pct: impact.current.gridPct, color: MIX_COLOR.grid },
    { key: 'as.impact.generator', pct: impact.current.generatorPct, color: MIX_COLOR.generator },
  ];
  // Same colour per source in both cards so they can be compared by eye.
  const projectedSegments: MixSegment[] = [
    { key: 'as.impact.solar', pct: impact.projected.solarCoveragePct, color: MIX_COLOR.solar },
    { key: 'as.impact.grid', pct: impact.projected.gridDependencyPct, color: MIX_COLOR.grid },
    { key: 'as.impact.generator', pct: impact.projected.generatorDependencyPct, color: MIX_COLOR.generator },
  ];

  return (
    <section className="border-t border-line-subtle py-10">
      <div className="container-page">
        <p className="eyebrow text-content-brand">{t('as.impact.eyebrow')}</p>
        <h2 className="mt-1 text-h2 text-content-primary">{t('as.impact.title')}</h2>
        <p className="mt-2 max-w-xl text-body text-content-secondary">{t('as.impact.subtitle')}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-line-subtle bg-bg-surface p-6">
            <h3 className="text-h4 text-content-primary">{t('as.impact.currentTitle')}</h3>
            <p className="mt-1 text-label-sm text-content-tertiary">{t('as.impact.currentNote')}</p>
            <MixBar segments={currentSegments} trackClassName="bg-bg-subtle" />
            <Legend segments={currentSegments} />
          </div>

          <div className="on-dark rounded-xl border-[1.5px] border-line-brand bg-bg-panel-raised p-6">
            <h3 className="text-h4 text-content-on-dark">{t('as.impact.projectedTitle')}</h3>
            <MixBar segments={projectedSegments} trackClassName="bg-bg-panel-deep" />

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Stat label={t('as.impact.solarCoverage')} value={`${impact.projected.solarCoveragePct}%`} />
              <Stat label={t('as.impact.gridDependency')} value={`${impact.projected.gridDependencyPct}%`} />
              <Stat label={t('as.impact.generatorDependency')} value={`${impact.projected.generatorDependencyPct}%`} />
              <Stat label={t('as.impact.batteryBackup')} value={`${fmt.dec(impact.projected.batteryBackupHours)} ${t('as.impact.unitHours')}`} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line-on-dark pt-4">
              <Stat label={t('as.impact.monthlySaving')} value={`${fmt.int(impact.estimatedMonthlySavingIQD)} ${t('as.impact.unitIQD')}`} badge />
              <Stat label={t('as.impact.annualSaving')} value={`${fmt.int(impact.estimatedAnnualSavingIQD)} ${t('as.impact.unitIQD')}`} badge />
            </div>

            <button
              type="button"
              onClick={() => setShowAssumptions((v) => !v)}
              className="mt-5 flex items-center gap-1.5 text-label-sm font-medium text-solar-300"
              aria-expanded={showAssumptions}
            >
              <Icon name="chevron-down" size={14} className={showAssumptions ? 'rotate-180 transition-transform' : 'transition-transform'} />
              {t('as.impact.assumptionsToggle')}
            </button>
            {showAssumptions && (
              <p className="mt-2.5 rounded-lg bg-bg-panel-deep p-4 text-label-sm text-content-on-dark-muted">
                {t('as.impact.assumptionsBody', {
                  gridBase: Math.round(PRICING_ASSUMPTIONS.BASELINE_GRID_SHARE * 100),
                  genBase: Math.round(PRICING_ASSUMPTIONS.BASELINE_GENERATOR_SHARE * 100),
                  gridTariff: PRICING_ASSUMPTIONS.GRID_TARIFF_IQD_PER_KWH,
                  genTariff: PRICING_ASSUMPTIONS.GENERATOR_TARIFF_IQD_PER_KWH,
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Legend({ segments }: { segments: MixSegment[] }) {
  const { t } = useLanguage();
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {segments.map((s) => (
        <li key={s.key} className="flex items-center justify-between text-label-sm">
          <span className="flex items-center gap-2 text-content-secondary">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {t(s.key)}
          </span>
          <span className="numeric text-content-primary">{s.pct}%</span>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p className="flex items-center gap-1.5 text-label-sm text-content-on-dark-muted">
        {label}
        {badge && (
          <span className="rounded-full bg-bg-panel-deep px-2 py-0.5 text-[0.7rem] font-medium text-solar-300">
            {t('as.impact.estimatedBadge')}
          </span>
        )}
      </p>
      <p className="numeric text-label font-semibold text-content-on-dark">{value}</p>
    </div>
  );
}

/**
 * Part-to-whole as one stacked bar. The legend and stats carry the values
 * for assistive tech, so the bar itself is decorative.
 */
function MixBar({ segments, trackClassName }: { segments: MixSegment[]; trackClassName: string }) {
  const { t } = useLanguage();
  return (
    <div className={`mt-5 flex h-3.5 w-full gap-x-[2px] overflow-hidden rounded-full ${trackClassName}`} aria-hidden="true">
      {segments.filter((s) => s.pct > 0).map((s) => (
        <div key={s.key} className="h-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} title={`${t(s.key)} · ${s.pct}%`} />
      ))}
    </div>
  );
}
