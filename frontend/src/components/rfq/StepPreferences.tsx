import { Icon } from '../icons/Icon';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { RadioCards } from '../ui/RadioCards';
import { Checkbox } from '../ui/Checkbox';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useQuoteRequest, type Timeline } from '../../state/QuoteRequestProvider';
import { formatIQD } from '../../data/rfq';
import type { StepErrors } from './validation';

/**
 * Step 3 — budget, timing and financing.
 *
 * The financing card is given its own visual treatment because for most Iraqi
 * households the barrier to solar is capital, not conviction. Surfacing the
 * instalment option here — before quotes are written — is what makes companies
 * price a financed variant alongside the cash price.
 */
export function StepPreferences({ errors }: { errors: StepErrors }) {
  const { t } = useLanguage();
  const { draft, update } = useQuoteRequest();

  const budgets = [
    { value: 'b1', label: t('s3.budget1') },
    { value: 'b2', label: t('s3.budget2') },
    { value: 'b3', label: t('s3.budget3') },
    { value: 'b4', label: t('s3.budget4') },
    { value: 'b5', label: t('s3.budget5') },
    { value: 'unsure', label: t('s3.budgetUnsure') },
  ];

  const timelines: { value: Timeline; label: string }[] = [
    { value: 'asap', label: t('s3.timeAsap') },
    { value: 'month', label: t('s3.timeMonth') },
    { value: 'quarter', label: t('s3.timeQuarter') },
    { value: 'exploring', label: t('s3.timeExploring') },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h2 className="text-h2 text-content-primary">{t('s3.title')}</h2>
        <p className="mt-2 max-w-prose text-body text-content-secondary">{t('s3.desc')}</p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label={t('s3.budget')}
          placeholder={t('s3.budgetPlaceholder')}
          value={draft.budget}
          error={errors.budget}
          options={budgets}
          onChange={(e) => update({ budget: e.target.value })}
        />
      </div>

      <RadioCards
        legend={t('s3.timeline')}
        name="timeline"
        value={draft.timeline}
        options={timelines}
        columns={4}
        error={errors.timeline}
        onChange={(v) => update({ timeline: v })}
      />

      <section className="rounded-xl border-[1.5px] border-line-brand bg-[var(--brand-subtle)] p-5">
        <h3 className="flex items-center gap-2.5 text-h4 text-content-primary">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--brand-primary)] text-content-on-brand">
            <Icon name="trending-up" size={18} />
          </span>
          {t('s3.financingTitle')}
        </h3>
        <p className="mt-3 max-w-prose text-body-sm text-content-secondary">
          {t('s3.financingDesc')}
        </p>
        <Checkbox
          className="mt-4"
          label={t('s3.financingYes')}
          checked={draft.financing}
          onChange={(v) => update({ financing: v })}
        />
      </section>

      <section className="rounded-xl border border-line-subtle bg-bg-surface p-5">
        <h3 className="text-h4 text-content-primary">{t('s3.greenInitiativeTitle')}</h3>
        <p className="mt-2 max-w-prose text-body-sm text-content-secondary">
          {t('s3.greenInitiativeDesc')}
        </p>
        <Checkbox
          className="mt-4"
          label={t('s3.greenInitiativeLabel')}
          checked={draft.greenInitiative}
          onChange={(greenInitiative) => update({ greenInitiative })}
        />
        {draft.greenInitiative && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-label-sm text-content-secondary">
              {t('s3.greenBudget')}
              <input
                aria-label={t('s3.greenBudget')}
                type="number"
                min="1"
                max="10000000000"
                step="1000"
                inputMode="numeric"
                value={draft.greenInitiativeBudgetIqd}
                onChange={(event) => update({ greenInitiativeBudgetIqd: event.target.value })}
                aria-invalid={Boolean(errors.greenInitiativeBudgetIqd)}
                className="min-h-11 rounded-md border border-line bg-bg-surface px-3 text-label text-content-primary"
              />
              {errors.greenInitiativeBudgetIqd && (
                <span className="text-body-sm text-[var(--status-danger)]">
                  {errors.greenInitiativeBudgetIqd}
                </span>
              )}
            </label>
            <label className="grid gap-1.5 text-label-sm text-content-secondary">
              {t('s3.greenRate')}
              <select
                aria-label={t('s3.greenRate')}
                value={draft.greenInitiativeRate}
                onChange={(event) => update({ greenInitiativeRate: Number(event.target.value) })}
                className="platform-select"
              >
                {[0, 2, 5].map((rate) => (
                  <option key={rate} value={rate}>{rate}%</option>
                ))}
              </select>
            </label>
            <div className="rounded-lg bg-bg-subtle p-4 sm:col-span-2" aria-live="polite">
              <p className="text-label-sm text-content-secondary">{t('s3.greenTerm')}</p>
              {Number(draft.greenInitiativeBudgetIqd) > 0 ? (
                <p className="mt-1 text-h4 text-content-primary">
                  {t('s3.greenMonthly')}: {formatIQD(
                    calculateGreenMonthlyPayment(
                      Number(draft.greenInitiativeBudgetIqd),
                      draft.greenInitiativeRate,
                    ),
                  )} IQD
                </p>
              ) : (
                <p className="mt-1 text-body-sm text-content-secondary">{t('s3.greenBudget')}</p>
              )}
              <p className="mt-2 text-body-sm text-content-tertiary">
                {t('s3.greenEstimateDisclaimer')}
              </p>
            </div>
          </div>
        )}
      </section>

      <Textarea
        label={t('s3.notes')}
        hint={t('s3.notesHint')}
        placeholder={t('s3.notesPlaceholder')}
        optional
        optionalLabel={t('rfq.optional')}
        value={draft.notes}
        onChange={(e) => update({ notes: e.target.value })}
      />
    </div>
  );
}

export function calculateGreenMonthlyPayment(principalIqd: number, annualRatePercent: number): number {
  const months = 60;
  const monthlyRate = annualRatePercent / 100 / 12;
  if (!Number.isFinite(principalIqd) || principalIqd <= 0) return 0;
  if (monthlyRate === 0) return principalIqd / months;
  return (principalIqd * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
}
