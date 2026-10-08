import { useState } from 'react';
import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { useLanguage, fmt } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';
import type { TierId, SystemTier, AssessmentInsight } from '../../ai/solarAssessment';
import type { SolarEstimate } from '../calculator/useSolarEstimate';
import type { Appliance } from '../../data/content';

const TIER_ORDER: TierId[] = ['economy', 'balanced', 'highIndependence'];

/** Three recommendation cards, a comparison table, and the dynamic "why this system" block. */
export function RecommendationTiers({
  tiers,
  appliances,
  estimate,
  insight,
  selected,
  onSelect,
}: {
  tiers: Record<TierId, SystemTier>;
  appliances: Appliance[];
  estimate: SolarEstimate;
  insight: AssessmentInsight;
  selected: TierId;
  onSelect: (id: TierId) => void;
}) {
  const { t, pick } = useLanguage();
  const [comparing, setComparing] = useState(false);

  const topAppliance = appliances.find((a) => a.id === insight.topApplianceId);
  const balanced = tiers.balanced;

  return (
    <section className="border-t border-line-subtle py-12">
      <div className="container-page">
        <p className="eyebrow text-content-brand">{t('ai.tiers.eyebrow')}</p>
        <h2 className="mt-1 text-h2 text-content-primary">{t('ai.tiers.title')}</h2>
        <p className="mt-2 max-w-xl text-body text-content-secondary">{t('ai.tiers.subtitle')}</p>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {TIER_ORDER.map((id) => (
            <TierCard key={id} id={id} tier={tiers[id]} isSelected={selected === id} onSelect={() => onSelect(id)} />
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <Button variant="secondary" onClick={() => setComparing((c) => !c)}>
            {comparing ? t('ai.compare.close') : t('ai.compare.cta')}
          </Button>
        </div>

        {comparing && (
          <div className="mt-6 overflow-x-auto rounded-xl border border-line-subtle bg-bg-surface">
            <table className="w-full min-w-[560px] text-start">
              <caption className="sr-only">{t('ai.compare.title')}</caption>
              <thead>
                <tr className="border-b border-line-subtle text-label-sm text-content-tertiary">
                  <th scope="col" className="px-4 py-3 text-start font-medium"> </th>
                  {TIER_ORDER.map((id) => (
                    <th key={id} scope="col" className="px-4 py-3 text-start font-medium text-content-primary">
                      {t(`ai.tier.${id}.name` as const)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="numeric">
                <CompareRow label={t('ai.compare.row.capacity')} cells={TIER_ORDER.map((id) => `${fmt.dec(tiers[id].panelKWp)} kWp`)} />
                <CompareRow label={t('ai.compare.row.panels')} cells={TIER_ORDER.map((id) => `${fmt.int(tiers[id].panelCount)}`)} />
                <CompareRow label={t('ai.compare.row.inverter')} cells={TIER_ORDER.map((id) => `${fmt.dec(tiers[id].inverterKW)} kW`)} />
                <CompareRow label={t('ai.compare.row.battery')} cells={TIER_ORDER.map((id) => `${fmt.dec(tiers[id].batteryKWh)} kWh`)} />
                <CompareRow label={t('ai.compare.row.backup')} cells={TIER_ORDER.map((id) => `${fmt.dec(tiers[id].backupHours)} h`)} />
                <CompareRow label={t('ai.compare.row.cost')} cells={TIER_ORDER.map((id) => `${fmt.int(tiers[id].estimatedCostIQD)} IQD`)} />
                <CompareRow label={t('ai.compare.row.coverage')} cells={TIER_ORDER.map((id) => `${tiers[id].solarCoveragePct}%`)} />
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-label-sm text-content-tertiary">{t('ai.estimateNote')}</p>

        {/* Why AI recommends the Balanced system — dynamic, from the user's own inputs */}
        <div className="on-dark mt-10 rounded-xl border-[1.5px] border-line-brand bg-bg-panel-raised p-6">
          <h3 className="flex items-center gap-2.5 text-h4 text-content-on-dark">
            <Icon name="zap" size={20} className="text-solar-300" />
            {t('ai.why.title')}
          </h3>
          <div className="mt-3 flex flex-col gap-2.5 text-body-sm text-content-on-dark-muted">
            <p>{t('ai.why.p1', { daily: fmt.dec(estimate.dailyKWh), count: insight.activeApplianceCount })}</p>
            <p>
              {t('ai.why.p2', {
                name: topAppliance ? pick(topAppliance.name) : '',
                share: insight.topLoadSharePct,
                inverter: fmt.dec(balanced.inverterKW),
              })}
            </p>
            <p>
              {t('ai.why.p3', {
                night: insight.nightSharePct,
                battery: fmt.dec(balanced.batteryKWh),
                backup: insight.backupHours,
              })}
            </p>
          </div>

          <h4 className="mt-5 text-label text-content-on-dark">{t('ai.considered.title')}</h4>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <li key={n} className="flex items-start gap-2 text-label-sm text-content-on-dark-muted">
                <Icon name="check" size={14} className="mt-0.5 shrink-0 text-[var(--status-success)]" />
                {t(`ai.considered.${n}` as TranslationKey)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CompareRow({ label, cells }: { label: string; cells: string[] }) {
  return (
    <tr className="border-b border-line-subtle last:border-0">
      <th scope="row" className="px-4 py-3 text-start text-label-sm font-medium text-content-secondary">
        {label}
      </th>
      {cells.map((c, i) => (
        <td key={i} className="px-4 py-3 text-label text-content-primary">
          {c}
        </td>
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
        isBalanced
          ? 'on-dark border-line-brand bg-bg-panel-raised shadow-panel'
          : isSelected
            ? 'border-line-brand bg-bg-surface'
            : 'border-line-subtle bg-bg-surface',
      )}
    >
      {isBalanced && (
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[var(--brand-primary)] px-3 py-1 text-label-sm font-semibold text-content-on-brand">
          <Icon name="star" size={13} />
          {t('ai.tier.balanced.badge')}
        </span>
      )}

      <h3 className={cn('text-h4', isBalanced ? 'text-content-on-dark' : 'text-content-primary')}>
        {t(`ai.tier.${id}.name` as const)}
      </h3>
      <p className="mt-0.5 text-label-sm font-medium text-content-brand">{t(`ai.tier.${id}.tag` as const)}</p>
      <p className={cn('mt-2 text-body-sm', isBalanced ? 'text-content-on-dark-muted' : 'text-content-secondary')}>
        {t(`ai.tier.${id}.desc` as const)}
      </p>

      <dl className={cn('mt-5 flex flex-col gap-2.5 border-t pt-4', isBalanced ? 'border-line-on-dark' : 'border-line-subtle')}>
        <Row onDark={isBalanced} label={t('ai.tier.panelCapacity')} value={`${fmt.dec(tier.panelKWp)} kWp`} />
        <Row onDark={isBalanced} label={t('ai.tier.panelCount')} value={`${fmt.int(tier.panelCount)}`} />
        <Row onDark={isBalanced} label={t('ai.tier.inverter')} value={`${fmt.dec(tier.inverterKW)} kW`} />
        <Row onDark={isBalanced} label={t('ai.tier.battery')} value={`${fmt.dec(tier.batteryKWh)} kWh`} />
        <Row onDark={isBalanced} label={t('ai.tier.cost')} value={`${fmt.int(tier.estimatedCostIQD)} IQD`} emphasis />
        <Row onDark={isBalanced} label={t('ai.tier.backup')} value={`${fmt.dec(tier.backupHours)} h`} />
        <Row onDark={isBalanced} label={t('ai.tier.coverage')} value={`${tier.solarCoveragePct}%`} />
      </dl>

      <Button
        className="mt-5"
        variant={isSelected ? 'primary' : isBalanced ? 'onDark' : 'secondary'}
        fullWidth
        onClick={onSelect}
        disabled={isSelected}
      >
        {isSelected ? t('ai.tier.selected') : t('ai.tier.selectCta')}
      </Button>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis = false,
  onDark = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  onDark?: boolean;
}) {
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
