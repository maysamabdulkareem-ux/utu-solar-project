import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { useCompanies } from '../../api/useCompanies';
import { buildQuotes, formatIQD } from '../../data/rfq';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { SubmittedRequest } from '../../state/QuoteRequestProvider';

/**
 * Side-by-side quote comparison — the screen the platform exists for.
 *
 * Every company answers the same fields, so the difference a customer sees is
 * the offer rather than how each company chose to write it up. That is the
 * thing a round of phone calls cannot produce.
 *
 * On a phone the table becomes one card per company: a 7-column grid at 390px
 * would be unreadable at any font size that still counts as text.
 */
export function QuoteComparison({ request }: { request: SubmittedRequest }) {
  const { t, pick } = useLanguage();
  const { companies } = useCompanies();

  const quotes = buildQuotes(request.draft.systemKWp, request.draft.financing).filter(
    (q) => request.draft.companyIds.includes(q.companyId) && request.statuses[q.companyId] === 'quoted',
  );

  const pending = request.draft.companyIds.filter((id) => request.statuses[id] !== 'quoted');
  const lowest = quotes.length ? Math.min(...quotes.map((q) => q.total)) : 0;
  const nameOf = (id: string) => {
    const c = companies.find((x) => x.id === id);
    return c ? pick(c.name) : id;
  };

  if (quotes.length === 0) return null;

  const rows: { label: string; value: (q: (typeof quotes)[number]) => string; numeric?: boolean }[] =
    [
      { label: t('cmp.total'), value: (q) => `${formatIQD(q.total)} IQD`, numeric: true },
      { label: t('cmp.capacity'), value: (q) => `${q.capacityKWp} kWp`, numeric: true },
      { label: t('cmp.panelBrand'), value: (q) => q.panelBrand },
      { label: t('cmp.inverterBrand'), value: (q) => q.inverterBrand },
      { label: t('cmp.batteryBrand'), value: (q) => pick(q.battery) },
      { label: t('cmp.warranty'), value: (q) => pick(q.warranty) },
      { label: t('cmp.install'), value: (q) => pick(q.installDays) },
      {
        label: t('cmp.financing'),
        value: (q) => (q.financing ? t('cmp.financingYes') : t('cmp.financingNo')),
      },
    ];

  return (
    <section className="mt-8">
      <h3 className="text-h3 text-content-primary">{t('cmp.title')}</h3>
      <p className="mt-2 max-w-prose text-body-sm text-content-secondary">{t('cmp.desc')}</p>

      {/* Tablet and up: one table, one scale */}
      <div className="mt-5 hidden overflow-x-auto rounded-xl border border-line-subtle bg-bg-surface md:block">
        <table className="w-full min-w-[46rem] border-collapse text-start">
          <caption className="sr-only">{t('cmp.title')}</caption>
          <thead>
            <tr className="border-b border-line-subtle">
              <th scope="col" className="p-4 text-start text-label-sm font-medium text-content-tertiary">
                {t('cmp.field')}
              </th>
              {quotes.map((q) => (
                <th key={q.companyId} scope="col" className="p-4 text-start">
                  <span className="block text-label text-content-primary">
                    {nameOf(q.companyId)}
                  </span>
                  {q.total === lowest && (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-label-sm text-[var(--status-success)]">
                      <Icon name="trending-up" size={13} />
                      {t('cmp.best')}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line-subtle last:border-0">
                <th scope="row" className="p-4 text-start text-body-sm font-normal text-content-tertiary">
                  {row.label}
                </th>
                {quotes.map((q) => (
                  <td
                    key={q.companyId}
                    className={cn(
                      'p-4 text-body-sm text-content-primary',
                      row.numeric && 'numeric font-medium',
                    )}
                  >
                    {row.value(q)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td />
              {quotes.map((q) => (
                <td key={q.companyId} className="p-4">
                  <Button variant="secondary" size="md">
                    {t('cmp.choose')}
                    <span className="sr-only"> — {nameOf(q.companyId)}</span>
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Phone: one card per quote, same field order */}
      <ul className="mt-5 flex flex-col gap-4 md:hidden">
        {quotes.map((q) => (
          <li
            key={q.companyId}
            className="rounded-xl border border-line-subtle bg-bg-surface p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-h4 text-content-primary">{nameOf(q.companyId)}</h4>
              {q.total === lowest && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--status-success-bg)] px-2.5 py-1 text-label-sm text-[var(--status-success)]">
                  <Icon name="trending-up" size={13} />
                  {t('cmp.best')}
                </span>
              )}
            </div>
            <dl className="mt-4 flex flex-col gap-2.5">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line-subtle pb-2.5 last:border-0"
                >
                  <dt className="text-body-sm text-content-tertiary">{row.label}</dt>
                  <dd
                    className={cn(
                      'text-body-sm text-content-primary',
                      row.numeric && 'numeric font-medium',
                    )}
                  >
                    {row.value(q)}
                  </dd>
                </div>
              ))}
            </dl>
            <Button variant="secondary" size="md" fullWidth className="mt-4">
              {t('cmp.choose')}
              <span className="sr-only"> — {nameOf(q.companyId)}</span>
            </Button>
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <p className="mt-4 flex items-start gap-2.5 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3">
          <Icon name="clock" size={16} className="mt-0.5 shrink-0 text-content-tertiary" />
          <span className="text-body-sm text-content-secondary">
            {t('cmp.awaiting')}: {pending.map(nameOf).join(' · ')}
          </span>
        </p>
      )}

      <p className="mt-3 text-label-sm text-content-tertiary">{t('cmp.note')}</p>
    </section>
  );
}
