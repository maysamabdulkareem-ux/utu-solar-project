import { useState } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { fmt, useLanguage } from '../../i18n/LanguageProvider';
import {
  TIER_ORDER,
  type AssessmentInsight,
  type SystemTier,
  type TierId,
} from '../../assessment/utuAssessment';
import type { SolarEstimate } from '../calculator/useSolarEstimate';
import type { Appliance } from '../../data/content';

/**
 * Three system options, an optional comparison table, the "why this size"
 * explanation read from the person's own appliances, and the hand-off that
 * sends the selected option to the quote request.
 */
export function RecommendationTiers({
  tiers,
  appliances,
  estimate,
  insight,
  selected,
  onSelect,
  onRequestQuotes,
}: {
  tiers: Record<TierId, SystemTier>;
  appliances: Appliance[];
  estimate: SolarEstimate;
  insight: AssessmentInsight;
  selected: TierId;
  onSelect: (id: TierId) => void;
  onRequestQuotes: () => void;
}) {
  const { t, pick } = useLanguage();
  const [comparing, setComparing] = useState(false);
  const topAppliance = appliances.find((a) => a.id === insight.topApplianceId);
  const chosen = tiers[selected];

  return (
    <section className="py-10">
      <div className="container-page">
        <p className="eyebrow text-content-brand">{t('as.tiers.eyebrow')}</p>

        <div className="mt-4 grid gap-5 lg:grid-cols-3">
          {TIER_ORDER.map((id) => (
            <TierCard key={id} id={id} tier={tiers[id]} isSelected={selected === id} onSelect={() => onSelect(id)} />
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <Button variant="secondary" size="md" aria-expanded={comparing} onClick={() => setComparing((c) => !c)}>
            {comparing ? t('as.compare.close') : t('as.compare.cta')}
          </Button>
        </div>

        {comparing && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-line-subtle bg-bg-surface">
            <table className="w-full min-w-[560px] text-start">
              <caption className="sr-only">{t('as.compare.title')}</caption>
              <thead>
                <tr className="border-b border-line-subtle text-label-sm text-content-tertiary">
                  <th scope="col" className="px-4 py-3 text-start font-medium"><span className="sr-only">{t('as.compare.title')}</span></th>
                  {TIER_ORDER.map((id) => (
                    <th key={id} scope="col" className="px-4 py-3 text-start font-medium text-content-primary">
                      {t(`as.tier.${id}.name`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="numeric">
                <CompareRow label={t('as.tier.panelCapacity')} cells={TIER_ORDER.map((id) => `${fmt.dec(tiers[id].panelKWp)} kWp`)} />
                <CompareRow label={t('as.tier.panelCount')} cells={TIER_ORDER.map((id) => fmt.int(tiers[id].panelCount))} />
                <CompareRow label={t('as.tier.inverter')} cells={TIER_ORDER.map((id) => `${fmt.dec(tiers[id].inverterKW)} kW`)} />
                <CompareRow label={t('as.tier.battery')} cells={TIER_ORDER.map((id) => `${fmt.dec(tiers[id].batteryKWh)} kWh`)} />
                <CompareRow label={t('as.tier.backup')} cells={TIER_ORDER.map((id) => `${fmt.dec(tiers[id].backupHours)} ${t('as.impact.unitHours')}`)} />
                <CompareRow label={t('as.tier.coverage')} cells={TIER_ORDER.map((id) => `${tiers[id].solarCoveragePct}%`)} />
                <CompareRow label={t('as.tier.cost')} cells={TIER_ORDER.map((id) => `${fmt.int(tiers[id].estimatedCostIQD)} ${t('as.impact.unitIQD')}`)} />
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-label-sm text-content-tertiary">{t('as.estimateNote')}</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-[3fr_2fr]">
          <div className="on-dark rounded-xl border-[1.5px] border-line-brand bg-bg-panel-raised p-6">
            <h2 className="flex items-center gap-2.5 text-h4 text-content-on-dark">
              <Icon name="zap" size={20} className="text-solar-300" />
              {t('as.why.title')}
            </h2>
            <div className="mt-3 flex flex-col gap-2.5 text-body-sm text-content-on-dark-muted">
              <p>{t('as.why.p1', { daily: fmt.dec(estimate.dailyKWh), count: insight.activeApplianceCount })}</p>
              {topAppliance && (
                <p>
                  {t('as.why.p2', {
                    name: pick(topAppliance.name),
                    share: insight.topLoadSharePct,
                    inverter: fmt.dec(tiers.balanced.inverterKW),
                  })}
                </p>
              )}
              <p>
                {t('as.why.p3', {
                  night: insight.nightSharePct,
                  battery: fmt.dec(tiers.balanced.batteryKWh),
                  backup: insight.backupHours,
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl border-[1.5px] border-line-brand bg-bg-surface p-6">
            <div>
              <h2 className="text-h4 text-content-primary">{t('as.request.title')}</h2>
              <p className="mt-2 text-body-sm text-content-secondary">
                {t('as.request.body', {
                  name: t(`as.tier.${selected}.name`),
                  size: fmt.dec(chosen.panelKWp),
                  battery: fmt.dec(chosen.batteryKWh),
                })}
              </p>
            </div>
            <Button onClick={onRequestQuotes} trailingArrow fullWidth>
              {t('as.request.cta')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompareRow({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-b border-line-subtle last:border-0">
      <th scope="row" className="px-4 py-3 text-start text-label-sm font-medium text-content-secondary">{label}</th>
      {cells.map((cell, i) => (
        <td key={i} className="px-4 py-3 text-label text-content-primary">{cell}</td>
      ))}
    </tr>
  );
}

function TierCard({
  id,
  tier,
  isSelected,
  onSelect,
}: {
  id: TierId;
  tier: SystemTier;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { t } = useLanguage();
  const isBalanced = id === 'balanced';

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border-[1.5px] p-6 transition-shadow',
        isBalanced ? 'on-dark bg-bg-panel-raised shadow-panel' : 'bg-bg-surface',
        isSelected ? 'border-line-brand' : isBalanced ? 'border-line-on-dark' : 'border-line-subtle',
      )}
    >
      {isBalanced && (
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-3 py-1 text-label-sm font-semibold text-content-on-brand">
          <Icon name="star" size={13} />
          {t('as.tier.balanced.badge')}
        </span>
      )}

      <h3 className={cn('text-h4', isBalanced ? 'text-content-on-dark' : 'text-content-primary')}>{t(`as.tier.${id}.name`)}</h3>
      <p className="mt-0.5 text-label-sm font-medium text-content-brand">{t(`as.tier.${id}.tag`)}</p>
      <p className={cn('mt-2 text-body-sm', isBalanced ? 'text-content-on-dark-muted' : 'text-content-secondary')}>
        {t(`as.tier.${id}.desc`)}
      </p>

      <dl className={cn('mt-5 flex flex-col gap-2.5 border-t pt-4', isBalanced ? 'border-line-on-dark' : 'border-line-subtle')}>
        <Row onDark={isBalanced} label={t('as.tier.panelCapacity')} value={`${fmt.dec(tier.panelKWp)} kWp`} />
        <Row onDark={isBalanced} label={t('as.tier.panelCount')} value={fmt.int(tier.panelCount)} />
        <Row onDark={isBalanced} label={t('as.tier.inverter')} value={`${fmt.dec(tier.inverterKW)} kW`} />
        <Row onDark={isBalanced} label={t('as.tier.battery')} value={`${fmt.dec(tier.batteryKWh)} kWh`} />
        <Row onDark={isBalanced} label={t('as.tier.backup')} value={`${fmt.dec(tier.backupHours)} ${t('as.impact.unitHours')}`} />
        <Row onDark={isBalanced} label={t('as.tier.coverage')} value={`${tier.solarCoveragePct}%`} />
        <Row onDark={isBalanced} label={t('as.tier.cost')} value={`${fmt.int(tier.estimatedCostIQD)} ${t('as.impact.unitIQD')}`} emphasis />
      </dl>

      <Button
        className="mt-5"
        variant={isSelected ? 'primary' : isBalanced ? 'onDark' : 'secondary'}
        fullWidth
        onClick={onSelect}
        aria-pressed={isSelected}
      >
        {isSelected ? t('as.tier.selected') : t('as.tier.selectCta')}
      </Button>
    </div>
  );
}

function Row({ label, value, emphasis = false, onDark = false }: { label: string; value: string; emphasis?: boolean; onDark?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn('text-label-sm', onDark ? 'text-content-on-dark-muted' : 'text-content-tertiary')}>{label}</dt>
      <dd
        className={cn(
          'numeric text-label',
          emphasis ? (onDark ? 'text-solar-300' : 'text-content-brand') : onDark ? 'text-content-on-dark' : 'text-content-primary',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
