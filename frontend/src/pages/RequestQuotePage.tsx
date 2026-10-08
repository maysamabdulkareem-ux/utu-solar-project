import { useCallback, useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/icons/Icon';
import { FlowHeader } from '../components/layout/FlowHeader';
import { ProgressSteps } from '../components/rfq/ProgressSteps';
import { StepSystem } from '../components/rfq/StepSystem';
import { StepSite } from '../components/rfq/StepSite';
import { StepPreferences } from '../components/rfq/StepPreferences';
import { StepCompanies } from '../components/rfq/StepCompanies';
import { StepContact } from '../components/rfq/StepContact';
import { RequestSummary } from '../components/rfq/RequestSummary';
import { validateStep, type StepErrors } from '../components/rfq/validation';
import { useCompanies } from '../api/useCompanies';
import { useLanguage } from '../i18n/LanguageProvider';
import { useQuoteRequest, type SubmittedRequest } from '../state/QuoteRequestProvider';
import { paths } from '../routes/useHashRoute';

const TOTAL_STEPS = 5;

/**
 * The five-step request flow.
 *
 * Validation runs on Continue, never while typing. On failure the step stays
 * put, the offending fields are marked, and focus moves to the error summary so
 * a keyboard or screen-reader user is told what happened instead of silently
 * failing to advance.
 */
export function RequestQuotePage() {
  const { t } = useLanguage();
  const { draft, submit, reset, isDirty } = useQuoteRequest();

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState<SubmittedRequest | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    reset();
    setStep(0);
    setErrors({});
    setReady(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [reset]);

  const translateErrors = useCallback(
    (raw: ReturnType<typeof validateStep>): StepErrors =>
      Object.fromEntries(Object.entries(raw).map(([k, key]) => [k, t(key!)])) as StepErrors,
    [t],
  );

  const goNext = () => {
    const raw = validateStep(step, draft);
    if (Object.keys(raw).length > 0) {
      setErrors(translateErrors(raw));
      document.getElementById('rfq-error-summary')?.focus();
      return;
    }
    setErrors({});
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpTo = (target: number) => {
    setErrors({});
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setSending(true);
    setSubmitError('');
    try {
      const request = await submit();
      setDone(request);
      reset();
      setStep(0);
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Request could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (done) return <Confirmation request={done} />;
  if (!ready) return null;

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <FlowHeader />
      <main id="main" className="bg-bg-page pb-20">
        <div className="container-page">
          <header className="border-b border-line-subtle py-8">
            <h1 className="text-h2 text-content-primary">{t('rfq.title')}</h1>
            <p className="mt-2 text-body text-content-secondary">{t('rfq.subtitle')}</p>
          </header>

          <div className="py-7">
            <ProgressSteps current={step} />
          </div>

          {/* Announced and focusable, so a failed Continue is never silent. */}
          <div
            id="rfq-error-summary"
            tabIndex={-1}
            role={hasErrors ? 'alert' : undefined}
            className={hasErrors ? 'mb-6' : 'sr-only'}
          >
            {hasErrors && (
              <p className="flex items-center gap-2.5 rounded-lg border-[1.5px] border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-body-sm text-[var(--status-danger)]">
                <Icon name="alert" size={18} className="shrink-0" />
                {t('err.fixFields')}
              </p>
            )}
          </div>

          <div className="max-w-3xl">
            {step === 0 && <StepSystem errors={errors} />}
            {step === 1 && <StepSite errors={errors} />}
            {step === 2 && <StepPreferences errors={errors} />}
            {step === 3 && <StepCompanies errors={errors} />}
            {step === 4 && <StepContact errors={errors} onEdit={jumpTo} />}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line-subtle pt-6">
            {step > 0 && (
              <Button variant="secondary" onClick={goBack}>
                {t('rfq.back')}
              </Button>
            )}
            <Button onClick={goNext} loading={sending} trailingArrow={!sending}>
              {step === TOTAL_STEPS - 1
                ? sending
                  ? t('rfq.submitting')
                  : t('rfq.submit')
                : t('rfq.next')}
            </Button>

            {isDirty && (
              <p className="ms-auto flex items-center gap-1.5 text-label-sm text-content-tertiary">
                <Icon name="check" size={14} className="text-[var(--status-success)]" />
                {t('rfq.draftSaved')}
              </p>
            )}
          </div>
          {submitError && (
            <p role="alert" className="mt-4 rounded-lg border border-[var(--status-danger)] bg-[var(--status-danger-bg)] px-4 py-3 text-body-sm text-[var(--status-danger)]">
              {submitError}
            </p>
          )}
        </div>
      </main>
    </>
  );
}

/** Post-submit screen: reference number, what happens next, and the read-back. */
function Confirmation({ request }: { request: SubmittedRequest }) {
  const { t, pick } = useLanguage();
  const { companies } = useCompanies();
  const { requests } = useQuoteRequest();
  // `request` is the snapshot returned at submit time — its `id` is still the
  // local placeholder. The server swaps in the real `group_id` a moment later
  // by updating the stored list, keyed on `localId`, so this looks that row
  // up live rather than showing a reference number that quietly went stale.
  const live = requests.find((r) => r.localId === request.localId) ?? request;
  const picked = companies.filter((c) => live.draft.companyIds.includes(c.id));

  return (
    <>
      <FlowHeader />
      <main id="main" className="bg-bg-page pb-20">
        <div className="container-page max-w-3xl">
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]">
              <Icon name="check" size={32} strokeWidth={2.5} />
            </span>
            <h1 className="text-h1 text-content-primary">{t('done.title')}</h1>
            <p className="text-body-lg text-content-secondary">
              {t('done.sub', { n: picked.length })}
            </p>
            <p className="mt-1 flex items-center gap-2 rounded-full border border-line bg-bg-surface px-4 py-2">
              <span className="text-label-sm text-content-tertiary">{t('done.ref')}</span>
              <span className="numeric text-label text-content-primary">{live.id}</span>
            </p>
          </div>

          <section className="rounded-xl border border-line-subtle bg-bg-surface p-6">
            <h2 className="text-h4 text-content-primary">{t('done.whatNext')}</h2>
            <ol className="mt-4 flex flex-col gap-3.5">
              {(['done.n1', 'done.n2', 'done.n3'] as const).map((k, i) => (
                <li key={k} className="flex gap-3">
                  <span className="numeric grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--brand-subtle)] text-label-sm text-content-brand">
                    {i + 1}
                  </span>
                  <span className="text-body-sm text-content-secondary">{t(k)}</span>
                </li>
              ))}
            </ol>
          </section>

          <ul className="mt-5 flex flex-wrap gap-2.5">
            {picked.map((c) => (
              <li
                key={c.id}
                className="inline-flex items-center gap-2 rounded-full border border-line-subtle bg-bg-surface px-3.5 py-2 text-label-sm text-content-primary"
              >
                <Icon name="solar-panel" size={14} className="text-content-tertiary" />
                {pick(c.name)}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3.5">
            <Button
              trailingArrow
              onClick={() => {
                window.location.hash = paths.requests;
              }}
            >
              {t('done.track')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.hash = paths.home;
              }}
            >
              {t('done.home')}
            </Button>
          </div>

          <div className="mt-10">
            <h2 className="mb-3 text-h4 text-content-primary">{t('s5.review')}</h2>
            <RequestSummary draft={live.draft} />
          </div>
        </div>
      </main>
    </>
  );
}
