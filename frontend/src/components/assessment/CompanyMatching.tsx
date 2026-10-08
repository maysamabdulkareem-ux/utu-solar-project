import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { useLanguage, fmt } from '../../i18n/LanguageProvider';
import { paths } from '../../routes/useHashRoute';
import type { CompanyMatch, SystemTier } from '../../ai/solarAssessment';

/**
 * AI Company Matching — never calls a company "the best", only "matched for
 * your requirements", and shows the reasoning behind the match on request.
 */
export function CompanyMatching({ matches, tier }: { matches: CompanyMatch[]; tier: SystemTier }) {
  const { t, pick } = useLanguage();
  const [openWhy, setOpenWhy] = useState<string | null>(null);

  return (
    <section className="border-t border-line-subtle py-12">
      <div className="container-page">
        <p className="eyebrow text-content-brand">{t('ai.match.eyebrow')}</p>
        <h2 className="mt-1 text-h2 text-content-primary">{t('ai.match.title')}</h2>
        <p className="mt-2 max-w-xl text-body text-content-secondary">{t('ai.match.subtitle')}</p>

        {matches.length === 0 ? (
          <p className="mt-8 text-body-sm text-content-tertiary">{t('ai.match.empty')}</p>
        ) : (
          <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((m) => (
              <li key={m.company.id} className="flex flex-col rounded-xl border border-line-subtle bg-bg-surface p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-h4 text-content-primary">{pick(m.company.name)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-label-sm text-content-tertiary">
                      <Icon name="map-pin" size={13} />
                      {pick(m.company.location)}
                    </p>
                  </div>
                  <span className="numeric shrink-0 rounded-full bg-[var(--brand-subtle)] px-3 py-1 text-label font-semibold text-content-brand">
                    {m.matchPct}%
                  </span>
                </div>

                <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-line-subtle bg-bg-subtle px-2.5 py-1 text-label-sm text-content-secondary">
                  <Icon name="shield-check" size={13} className="text-[var(--status-success)]" />
                  {t('ai.match.badge')}
                </span>

                <dl className="mt-4 flex flex-col gap-2 border-t border-line-subtle pt-4 text-label-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-content-tertiary">{t('ai.match.compatible')}</dt>
                    <dd className="numeric text-content-primary">{fmt.dec(tier.panelKWp)} kWp</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-content-tertiary">{t('ai.match.warranty')}</dt>
                    <dd className="text-content-primary">{m.warrantyYears} y</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-content-tertiary">{t('ai.match.projects')}</dt>
                    <dd className="text-content-primary">{pick(m.company.projects)}</dd>
                  </div>
                </dl>

                <div className="mt-3">
                  <p className="text-label-sm text-content-tertiary">
                    {t('ai.match.services')}
                    {m.servicesAreExample && (
                      <span className="ms-1.5 text-content-tertiary/70">({t('ai.match.servicesExample')})</span>
                    )}
                  </p>
                  <p className="mt-1 text-label-sm text-content-secondary">
                    {(m.servicesAreExample ? ['Installation', 'Maintenance', 'Battery Systems'] : pick(m.company.services)).join(' · ')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenWhy((cur) => (cur === m.company.id ? null : m.company.id))}
                  className="mt-4 flex items-center gap-1.5 text-start text-label-sm font-medium text-content-brand"
                  aria-expanded={openWhy === m.company.id}
                >
                  <Icon
                    name="chevron-down"
                    size={14}
                    className={openWhy === m.company.id ? 'rotate-180 transition-transform' : 'transition-transform'}
                  />
                  {t('ai.match.whyToggle')}
                </button>
                {openWhy === m.company.id && (
                  <p className="mt-2 rounded-lg bg-bg-subtle p-3.5 text-label-sm text-content-secondary">
                    {t('ai.match.whyBody', { pct: m.matchPct, size: fmt.dec(tier.panelKWp) })}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Button size="md" variant="secondary" onClick={() => {}}>
                    {t('ai.match.viewCompany')}
                  </Button>
                  <Button
                    size="md"
                    onClick={() => {
                      window.location.hash = paths.request;
                    }}
                  >
                    {t('ai.match.requestQuote')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
