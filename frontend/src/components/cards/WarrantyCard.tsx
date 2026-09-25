import { Icon } from '../icons/Icon';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Warranty } from '../../data/content';

/** One warranty term: component, duration and the condition in plain language. */
export function WarrantyCard({ warranty }: { warranty: Warranty }) {
  const { pick } = useLanguage();

  return (
    <div className="flex h-full flex-col gap-3.5 rounded-lg border border-line-subtle bg-bg-surface p-6">
      <span className="grid h-11 w-11 place-items-center rounded-[11px] bg-[var(--brand-subtle)] text-content-brand">
        <Icon name={warranty.icon} size={20} />
      </span>
      <h3 className="text-label text-content-secondary">{pick(warranty.component)}</h3>
      <p className="flex items-baseline gap-1.5">
        <span className="numeric text-data-l text-content-primary">{warranty.duration}</span>
        <span className="text-label text-content-tertiary">{pick(warranty.unit)}</span>
      </p>
      <p className="text-body-sm text-content-secondary">{pick(warranty.note)}</p>
    </div>
  );
}
