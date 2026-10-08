import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { useLanguage, fmt } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';
import { AI_ASSUMPTIONS, type EnergyImpact } from '../../ai/solarAssessment';

/**
 * The four energy-mix identity colors, validated (OKLCH lightness/chroma +
 * CVD-simulated adjacent-pair separation, both light and dark chart
 * surfaces) with the dataviz skill's checker rather than reused from the
 * brand's UI tokens — panel/dusk/sage read too gray at their UI steps, and
 * solar/sunset sit too close in hue, to double as a 4-way categorical set.
 * See the `--chart-*` block in tokens.css for the full rationale.
 */
const MIX_COLOR: Record<'grid' | 'generator' | 'solar' | 'battery', string> = {
  grid: 'var(--chart-grid)',
  generator: 'var(--chart-generator)',
  solar: 'var(--chart-solar)',
  battery: 'var(--chart-battery)',
};

/**
 * "Your Energy Future" — current mix vs. projected mix once the recommended
 * system is installed. Every projected figure is explicitly labeled
 * "Estimated" and the assumptions behind the savings are one click away,
 * never asserted as a guarantee.
 */
export function EnergyImpactSection({ impact }: { impact: EnergyImpact }) {
  const { t } = useLanguage();
  const [showAssumptions, setShowAssumptions] = useState(false);

  const currentSegments = [
    { key: 'ai.impact.grid' as const, pct: impact.current.gridPct, color: MIX_COLOR.grid },
    { key: 'ai.impact.generator' as const, pct: impact.current.generatorPct, color: MIX_COLOR.generator },
    { key: 'ai.impact.solar' as const, pct: impact.current.solarPct, color: MIX_COLOR.solar },
    { key: 'ai.impact.battery' as const, pct: impact.current.batteryPct, color: MIX_COLOR.battery },
  ];

  // Same three identities as the current mix (solar/grid/generator always sum
  // to 100 here — battery isn't a share of the mix, it's backup hours, shown
  // as its own stat below) so a reader can match color across both cards.
  const projectedSegments = [
    { key: 'ai.impact.solar' as const, pct: impact.projected.solarCoveragePct, color: MIX_COLOR.solar },
    { key: 'ai.impact.grid' as const, pct: impact.projected.gridDependencyPct, color: MIX_COLOR.grid },
    { key: 'ai.impact.generator' as const, pct: impact.projected.generatorDependencyPct, color: MIX_COLOR.generator },
  ];

  return (
    <section className="border-t border-line-subtle bg-bg-page py-12">
      <div className="container-page">
        <p className="eyebrow text-content-brand">{t('ai.impact.eyebrow')}</p>
        <h2 className="mt-1 text-h2 text-content-primary">{t('ai.impact.title')}</h2>
        <p className="mt-2 max-w-xl text-body text-content-secondary">{t('ai.impact.subtitle')}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Current mix */}
          <div className="rounded-xl border border-line-subtle bg-bg-surface p-6">
            <h3 className="text-h4 text-content-primary">{t('ai.impact.currentTitle')}</h3>
            <p className="mt-1 text-label-sm text-content-tertiary">{t('ai.impact.currentNote')}</p>

            <EnergyMixBar segments={currentSegments} trackClassName="bg-bg-subtle" />
            <ul className="mt-4 flex flex-col gap-2.5">
              {currentSegments.map((s) => (
                <li key={s.key} className="flex items-center justify-between text-label-sm">
                  <span className="flex items-center gap-2 text-content-secondary">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
                    {t(s.key)}
                  </span>
                  <span className="numeric text-content-primary">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Projected mix */}
          <div className="on-dark rounded-xl border-[1.5px] border-line-brand bg-bg-panel-raised p-6">
            <h3 className="text-h4 text-content-on-dark">{t('ai.impact.projectedTitle')}</h3>

            <EnergyMixBar segments={projectedSegments} trackClassName="bg-bg-panel-deep" />

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Stat label={t('ai.impact.solarCoverage')} value={`${impact.projected.solarCoveragePct}%`} />
              <Stat label={t('ai.impact.gridDependency')} value={`${impact.projected.gridDependencyPct}%`} />
              <Stat label={t('ai.impact.generatorDependency')} value={`${impact.projected.generatorDependencyPct}%`} />
              <Stat
                label={t('ai.impact.batteryBackup')}
                value={`${fmt.dec(impact.projected.batteryBackupHours)} ${t('ai.impact.unitHours')}`}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line-on-dark/20 pt-4">
              <Stat label={t('ai.impact.monthlySaving')} value={`${fmt.int(impact.estimatedMonthlySavingIQD)} ${t('ai.impact.unitIQD')}`} badge />
              <Stat label={t('ai.impact.annualSaving')} value={`${fmt.int(impact.estimatedAnnualSavingIQD)} ${t('ai.impact.unitIQD')}`} badge />
            </div>

            <button
              type="button"
              onClick={() => setShowAssumptions((v) => !v)}
              className="mt-5 flex items-center gap-1.5 text-label-sm font-medium text-content-brand"
              aria-expanded={showAssumptions}
            >
              <Icon name="chevron-down" size={14} className={showAssumptions ? 'rotate-180 transition-transform' : 'transition-transform'} />
              {t('ai.impact.assumptionsToggle')}
            </button>
            {showAssumptions && (
              <p className="mt-2.5 rounded-lg bg-bg-panel-deep p-4 text-label-sm text-content-on-dark-muted">
                {t('ai.impact.assumptionsBody', {
                  gridBase: Math.round(AI_ASSUMPTIONS.BASELINE_GRID_SHARE * 100),
                  genBase: Math.round(AI_ASSUMPTIONS.BASELINE_GENERATOR_SHARE * 100),
                  gridTariff: AI_ASSUMPTIONS.GRID_TARIFF_IQD_PER_KWH,
                  genTariff: AI_ASSUMPTIONS.GENERATOR_TARIFF_IQD_PER_KWH,
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, badge = false }: { label: string; value: string; badge?: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p className="flex items-center gap-1.5 text-label-sm text-content-on-dark">
        {label}
        {badge && (
          <span className="rounded-full bg-bg-panel-deep px-2 py-0.5 text-[0.65rem] font-medium text-solar-300">
            {t('ai.impact.estimatedBadge')}
          </span>
        )}
      </p>
      <p className="numeric text-label font-semibold text-content-on-dark">{value}</p>
    </div>
  );
}

type MixSegment = { key: TranslationKey; pct: number; color: string };

/**
 * Part-to-whole share as a horizontal stacked bar — the form the dataviz
 * skill calls for a mix like this (not a donut: 3–4 categorical slices read
 * faster as adjacent bar length than as wedge angle, and it stays legible at
 * this card's width). A 2px surface-color gap separates touching segments
 * instead of a border, and the bar's own ends are the only rounded corners —
 * the mark spec, not a decorative choice. Each segment shows its exact value
 * on hover; the legend underneath is the always-visible identity channel
 * (with the same values), so the bar itself is decorative to assistive tech.
 */
function EnergyMixBar({ segments, trackClassName }: { segments: MixSegment[]; trackClassName: string }) {
  const { t } = useLanguage();
  const visible = segments.filter((s) => s.pct > 0);

  return (
    <div
      className={`mt-5 flex h-3.5 w-full gap-x-[2px] overflow-hidden rounded-full ${trackClassName}`}
      aria-hidden="true"
    >
      {visible.map((s) => (
        <div key={s.key} className="group/seg relative h-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }}>
          {/* Hover/focus tooltip — a pointer can rest on a thin segment even
             where the legend below is out of the eye's immediate path. */}
          <div
            className="pointer-events-none absolute -top-2 start-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-bg-inverse px-2 py-1 text-[0.7rem] font-medium text-content-on-dark opacity-0 shadow-panel transition-opacity group-hover/seg:opacity-100"
          >
            {t(s.key)} · {s.pct}%
          </div>
        </div>
      ))}
    </div>
  );
}
