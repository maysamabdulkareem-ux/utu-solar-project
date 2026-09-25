import { Icon } from '../icons/Icon';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Step } from '../../data/content';

/** One step of How It Works. The ordinal is decorative — order comes from the list. */
export function StepCard({ step }: { step: Step }) {
  const { pick } = useLanguage();

  return (
    <div className="flex h-full flex-col gap-4 rounded-xl border border-line-subtle bg-bg-surface p-6">
      <div className="flex items-center gap-3.5">
        <span aria-hidden="true" className="numeric text-data-l text-line">
          {step.number}
        </span>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[var(--brand-subtle)] text-content-brand">
          <Icon name={step.icon} size={22} />
        </span>
      </div>
      <h3 className="text-h4 text-content-primary">{pick(step.title)}</h3>
      <p className="text-body-sm text-content-secondary">{pick(step.description)}</p>
    </div>
  );
}
