import { Icon } from '../icons/Icon';
import { Input } from '../ui/Input';
import { RadioCards } from '../ui/RadioCards';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useQuoteRequest, type SystemType } from '../../state/QuoteRequestProvider';
import type { StepErrors } from './validation';

/**
 * Step 1 — confirm the system.
 *
 * Reached two ways. From the calculator the fields are already the person's own
 * result, and the job here is confirmation rather than entry — retyping numbers
 * the product just computed is the fastest way to lose someone. From the header
 * they arrive cold, and the same fields are only sensible starting values, so
 * the step says so plainly and points at the calculator instead of claiming a
 * result that was never produced.
 */
export function StepSystem({ errors }: { errors: StepErrors }) {
  const { t } = useLanguage();
  const { draft, update } = useQuoteRequest();

  const types: { value: SystemType; label: string; description: string }[] = [
    { value: 'ongrid', label: t('s1.ongrid'), description: t('s1.ongridDesc') },
    { value: 'hybrid', label: t('s1.hybrid'), description: t('s1.hybridDesc') },
    { value: 'offgrid', label: t('s1.offgrid'), description: t('s1.offgridDesc') },
    { value: 'unsure', label: t('s1.unsure'), description: t('s1.unsureDesc') },
  ];

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h2 className="text-h2 text-content-primary">{t('s1.title')}</h2>
        <p className="mt-2 max-w-prose text-body text-content-secondary">
          {t(draft.fromCalculator ? 's1.desc' : 's1.descCold')}
        </p>
      </header>

      {draft.fromCalculator ? (
        <p className="flex w-fit items-center gap-2 rounded-full bg-[var(--brand-subtle)] py-1.5 ps-2.5 pe-3.5 text-label-sm text-content-brand">
          <Icon name="calculator" size={15} className="shrink-0" />
          {t('s1.fromCalc')}
        </p>
      ) : (
        <p className="flex max-w-prose items-start gap-2.5 rounded-lg border border-line-subtle bg-bg-subtle px-4 py-3 text-label-sm text-content-secondary">
          <Icon name="calculator" size={16} className="mt-0.5 shrink-0 text-content-tertiary" />
          <span>
            {t('s1.noCalc')}{' '}
            <a
              href="#calculator"
              className="whitespace-nowrap rounded-sm font-semibold text-content-brand underline underline-offset-2"
            >
              {t('s1.runCalc')}
            </a>
          </span>
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <Input
          label={t('s1.size')}
          type="number"
          inputMode="decimal"
          min={0.5}
          step={0.1}
          suffix="kWp"
          value={draft.systemKWp}
          error={errors.systemKWp}
          onChange={(e) => update({ systemKWp: Number(e.target.value) })}
        />
        <Input
          label={t('s1.battery')}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          suffix="kWh"
          value={draft.batteryKWh}
          onChange={(e) => update({ batteryKWh: Number(e.target.value) })}
        />
        <Input
          label={t('s1.panels')}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={draft.panelCount}
          error={errors.panelCount}
          onChange={(e) => update({ panelCount: Number(e.target.value) })}
        />
      </div>

      <RadioCards
        legend={t('s1.type')}
        name="systemType"
        value={draft.systemType}
        options={types}
        columns={2}
        onChange={(v) => update({ systemType: v })}
      />
    </div>
  );
}
