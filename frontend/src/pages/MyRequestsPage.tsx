import { useEffect } from 'react';
import { cn } from '../lib/cn';
import { Icon, type IconName } from '../components/icons/Icon';
import { Button } from '../components/ui/Button';
import { FlowHeader } from '../components/layout/FlowHeader';
import { Footer } from '../components/layout/Footer';
import { QuoteComparison } from '../components/rfq/QuoteComparison';
import { useCompanies } from '../api/useCompanies';
import { governorates } from '../data/rfq';
import { useLanguage } from '../i18n/LanguageProvider';
import { useQuoteRequest, type CompanyStatus } from '../state/QuoteRequestProvider';
import { paths } from '../routes/useHashRoute';
import type { TranslationKey } from '../i18n/translations';

const STATUS: Record<CompanyStatus, { label: TranslationKey; icon: IconName; className: string }> = {
  sent: {
    label: 'my.statusSent',
    icon: 'clock',
    className: 'text-content-tertiary bg-bg-subtle border-line-subtle',
  },
  viewed: {
    label: 'my.statusViewed',
    icon: 'search',
    className:
      'text-[var(--color-dusk-500)] bg-[var(--color-dusk-50)] border-[var(--color-dusk-300)]',
  },
  quoted: {
    label: 'my.statusQuoted',
    icon: 'check',
    className:
      'text-[var(--status-success)] bg-[var(--status-success-bg)] border-[var(--status-success)]',
  },
  declined: {
    label: 'my.statusDeclined',
    icon: 'x-mark',
    className:
      'text-[var(--status-danger)] bg-[var(--status-danger-bg)] border-[var(--status-danger)]',
  },
};

/**
 * Request tracking.
 *
 * Status is per company, not per request — "sent" tells the customer nothing
 * when three companies are involved and only one has replied. Each row carries
 * an icon and a word, so progress survives greyscale.
 */
export function MyRequestsPage() {
  const { t, pick, lang } = useLanguage();
  const { requests, refreshFromServer } = useQuoteRequest();
  const { companies } = useCompanies();

  // Local storage shows what this browser remembers; this brings in
  // whatever the server has, including status changes made from elsewhere.
  // A no-op when no request has been sent from this browser yet.
  useEffect(() => {
    refreshFromServer();
  }, [refreshFromServer]);

  const nameOf = (id: string) => {
    const c = companies.find((x) => x.id === id);
    return c ? pick(c.name) : id;
  };

  const dateFmt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-IQ' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <>
      <FlowHeader />
      <main id="main" className="min-h-[60vh] bg-bg-page pb-20">
        <div className="container-page">
          <header className="border-b border-line-subtle py-8">
            <h1 className="text-h2 text-content-primary">{t('my.title')}</h1>
            <p className="mt-2 text-body text-content-secondary">{t('my.desc')}</p>
          </header>

          {requests.length === 0 ? (
            <div
              role="status"
              className="mt-10 rounded-xl border border-dashed border-line bg-bg-surface px-6 py-16 text-center"
            >
              <Icon
                name="file-check"
                size={32}
                className="mx-auto text-content-tertiary"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-h4 text-content-primary">{t('my.empty')}</h2>
              <p className="mx-auto mt-2 max-w-sm text-body-sm text-content-secondary">
                {t('my.emptyBody')}
              </p>
              <Button
                className="mt-6"
                trailingArrow
                onClick={() => {
                  window.location.hash = '#calculator';
                }}
              >
                {t('my.emptyCta')}
              </Button>
            </div>
          ) : (
            <ul className="mt-8 flex flex-col gap-8">
              {requests.map((req) => {
                const gov = governorates.find((g) => g.id === req.draft.governorate);
                const quoted = Object.values(req.statuses).filter((s) => s === 'quoted').length;

                return (
                  <li
                    key={req.id}
                    className="rounded-xl border border-line-subtle bg-bg-surface p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="numeric text-label text-content-primary">{req.id}</p>
                        <p className="mt-1 text-label-sm text-content-tertiary">
                          {t('my.sent', { d: dateFmt.format(new Date(req.createdAt)) })}
                        </p>
                      </div>
                      <p
                        className={cn(
                          'numeric rounded-full border px-3 py-1 text-label-sm',
                          quoted > 0
                            ? 'border-[var(--status-success)] bg-[var(--status-success-bg)] text-[var(--status-success)]'
                            : 'border-line-subtle bg-bg-subtle text-content-tertiary',
                        )}
                      >
                        {t('my.quotesIn', { n: quoted, total: req.draft.companyIds.length })}
                      </p>
                    </div>

                    <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-y border-line-subtle py-4">
                      <div>
                        <dt className="text-label-sm text-content-tertiary">{t('my.system')}</dt>
                        <dd className="numeric mt-0.5 text-label text-content-primary">
                          {req.draft.systemKWp} kWp · {req.draft.panelCount}{' '}
                          {t('res.unitPanels')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-label-sm text-content-tertiary">{t('my.location')}</dt>
                        <dd className="mt-0.5 text-label text-content-primary">
                          {gov ? pick(gov.name) : '—'}
                          {req.draft.district ? ` · ${req.draft.district}` : ''}
                        </dd>
                      </div>
                    </dl>

                    <ul className="mt-4 flex flex-col gap-2.5">
                      {req.draft.companyIds.map((cid) => {
                        const s = STATUS[req.statuses[cid] ?? 'sent'];
                        return (
                          <li
                            key={cid}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-subtle px-4 py-3"
                          >
                            <span className="text-label text-content-primary">{nameOf(cid)}</span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label-sm',
                                s.className,
                              )}
                            >
                              <Icon name={s.icon} size={13} />
                              {t(s.label)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <QuoteComparison request={req} />
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-10">
            <Button
              variant="secondary"
              onClick={() => {
                window.location.hash = paths.home;
              }}
            >
              {t('done.home')}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
