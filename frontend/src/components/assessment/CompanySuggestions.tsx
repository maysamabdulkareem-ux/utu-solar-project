import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { Rating } from '../ui/Rating';
import { VerificationBadge } from '../ui/VerificationBadge';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Company } from '../../data/content';

/**
 * Verified companies that can quote the selected system.
 *
 * Only real data from the API: verification status, verified-review rating
 * and completed projects. There is deliberately no "match %", warranty or
 * service list — the platform has no data that would make those true yet.
 */
export function CompanySuggestions({
  companies,
  loading,
  onRequestFrom,
}: {
  companies: Company[];
  loading: boolean;
  onRequestFrom: (companyId: string) => void;
}) {
  const { t, pick } = useLanguage();

  return (
    <section className="border-t border-line-subtle py-10">
      <div className="container-page">
        <p className="eyebrow text-content-brand">{t('as.companies.eyebrow')}</p>
        <h2 className="mt-1 text-h2 text-content-primary">{t('as.companies.title')}</h2>
        <p className="mt-2 max-w-xl text-body text-content-secondary">{t('as.companies.subtitle')}</p>

        {loading ? (
          <p role="status" className="mt-8 text-body-sm text-content-tertiary">{t('as.companies.loading')}</p>
        ) : companies.length === 0 ? (
          <p className="mt-8 text-body-sm text-content-tertiary">{t('as.companies.empty')}</p>
        ) : (
          <ul className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <li key={company.id} className="flex flex-col rounded-xl border border-line-subtle bg-bg-surface p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-h4 text-content-primary">{pick(company.name)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-label-sm text-content-tertiary">
                      <Icon name="map-pin" size={13} />
                      {pick(company.location)}
                    </p>
                  </div>
                  <VerificationBadge status={company.status} className="shrink-0" />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-subtle pt-4 text-label-sm text-content-secondary">
                  {company.reviews > 0 ? (
                    <span className="flex items-center gap-2">
                      <Rating score={company.rating} />
                      {t('as.companies.reviews', { n: company.reviews })}
                    </span>
                  ) : (
                    <span>{t('as.companies.noReviews')}</span>
                  )}
                  <span>{pick(company.projects)}</span>
                </div>

                <div className="mt-auto flex flex-wrap gap-2.5 pt-5">
                  <Button size="md" onClick={() => onRequestFrom(company.id)}>
                    {t('as.companies.request')}
                  </Button>
                  <a
                    href={`#/companies/${company.id}`}
                    className="inline-flex items-center rounded-md px-3 py-2 text-label-sm font-medium text-content-brand underline underline-offset-2"
                  >
                    {t('as.companies.view')}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
