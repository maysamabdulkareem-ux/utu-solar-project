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
  const { t, pick, lang } = useLanguage();
  const { draft, update } = useQuoteRequest();
  const { companies, source } = useCompanies();

  const selected = draft.companyIds;
  const atLimit = selected.length >= MAX_COMPANIES;
  const includesPending = companies.some((company) => company.status === 'pending');

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
        {includesPending && (
          <p role="note" className="mt-3 rounded-md border border-[var(--status-warning)] bg-[var(--status-warning-bg)] px-4 py-3 text-body-sm text-content-secondary">
            {lang === 'ar'
              ? 'تگدر تختار شركة «قيد التحقق»، لكن بياناتها وأدلتها ما مكتملة المراجعة بعد. راجع شارة كل شركة قبل الإرسال.'
              : 'You can choose a company marked "Pending verification", but its business and project evidence has not completed review. Check each badge before sending.'}
          </p>
        )}
      </header>

      <ul className="flex flex-col gap-4">
        {companies.length === 0 && (
          <li role="status" className="rounded-lg border border-line-subtle bg-bg-surface px-5 py-4 text-body-sm text-content-secondary">
            {source === 'loading'
              ? (lang === 'ar' ? 'جارٍ تحميل الشركات…' : 'Loading installers…')
              : source === 'unavailable'
                ? (lang === 'ar' ? 'تعذّر تحميل الشركات. تأكد من تشغيل الخدمة ثم أعد المحاولة.' : 'Companies could not be loaded. Check the service and try again.')
                : <>{lang === 'ar' ? 'ماكو شركات مسجلة متاحة لطلب عرض حالياً. ' : 'There are no registered companies to request a quote from yet. '}<a className="text-content-brand underline" href="#/company">{lang === 'ar' ? 'سجّل شركتك' : 'Register a company'}</a></>}
          </li>
        )}
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
