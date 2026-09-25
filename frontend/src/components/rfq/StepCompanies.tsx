import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { Rating } from '../ui/Rating';
import { VerificationBadge } from '../ui/VerificationBadge';
import { useCompanies } from '../../api/useCompanies';
import { matchReasons } from '../../data/rfq';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useQuoteRequest } from '../../state/QuoteRequestProvider';
import { MAX_COMPANIES, type StepErrors } from './validation';

/**
 * Step 4 — pick who to ask.
 *
 * Each company carries a stated reason it surfaced. A bare list would leave the
 * customer doing the filtering themselves, which is the job they came here to
 * hand over.
 */
export function StepCompanies({ errors }: { errors: StepErrors }) {
  const { t, pick } = useLanguage();
  const { draft, update } = useQuoteRequest();
  const { companies } = useCompanies();

  const selected = draft.companyIds;
  const atLimit = selected.length >= MAX_COMPANIES;

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      update({ companyIds: selected.filter((c) => c !== id) });
    } else if (!atLimit) {
      update({ companyIds: [...selected, id] });
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h2 className="text-h2 text-content-primary">{t('s4.title')}</h2>
        <p className="mt-2 max-w-prose text-body text-content-secondary">
          {t('s4.desc', { max: MAX_COMPANIES })}
        </p>
        <p className="numeric mt-3 text-label text-content-brand">
          {t('s4.selected', { n: selected.length, max: MAX_COMPANIES })}
        </p>
      </header>

      <ul className="flex flex-col gap-4">
        {companies.map((company) => {
          const isSelected = selected.includes(company.id);
          const disabled = !isSelected && atLimit;
          const name = pick(company.name);

          return (
            <li key={company.id}>
              <label
                className={cn(
                  'flex cursor-pointer flex-col gap-4 rounded-xl border-[1.5px] p-5 transition-colors',
                  'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--focus-ring)]',
                  isSelected
                    ? 'border-line-brand bg-[var(--brand-subtle)]'
                    : 'border-line bg-bg-surface hover:border-line-strong',
                  disabled && 'cursor-not-allowed opacity-55',
                )}
              >
                <div className="flex items-start gap-3.5">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => toggle(company.id)}
                  />
                  <span
                    aria-hidden="true"
                    className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[13px] text-solar-400"
                    style={{ backgroundImage: 'linear-gradient(145deg, #16242d 0%, #0a0f13 100%)' }}
                  >
                    <Icon name="solar-panel" size={24} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <span className="block text-h4 text-content-primary">{name}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-label-sm text-content-tertiary">
                      <Icon name="map-pin" size={14} className="shrink-0" />
                      {pick(company.location)}
                    </span>
                  </div>

                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-[7px] border-[1.5px] transition-colors',
                      isSelected
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-content-on-brand'
                        : 'border-line',
                    )}
                  >
                    {isSelected && <Icon name="check" size={14} strokeWidth={3} />}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <VerificationBadge status={company.status} />
                  <Rating score={company.rating} reviewCount={company.reviews} />
                  <span className="text-label-sm text-content-tertiary">
                    {pick(company.projects)}
                  </span>
                </div>

                {matchReasons[company.id] && (
                  <p className="flex items-start gap-2.5 rounded-lg bg-bg-subtle px-4 py-3">
                    <Icon
                      name="check"
                      size={15}
                      className="mt-0.5 shrink-0 text-[var(--status-success)]"
                    />
                    <span className="text-body-sm text-content-secondary">
                      <span className="font-medium text-content-primary">{t('s4.why')}: </span>
                      {pick(matchReasons[company.id])}
                    </span>
                  </p>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {errors.companyIds && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-body-sm text-[var(--status-danger)]"
        >
          <Icon name="alert" size={16} className="shrink-0" />
          {errors.companyIds}
        </p>
      )}
    </div>
  );
}
