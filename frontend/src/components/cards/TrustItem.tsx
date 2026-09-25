import { Icon } from '../icons/Icon';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { TrustPoint } from '../../data/content';

/** One reason to trust the marketplace: icon, claim, and the check behind it. */
export function TrustItem({ point }: { point: TrustPoint }) {
  const { pick } = useLanguage();

  return (
    <div className="flex h-full flex-col gap-3">
      <span className="grid h-12 w-12 place-items-center rounded-[13px] bg-[var(--color-sunset-50)] text-[var(--color-sunset-500)]">
        <Icon name={point.icon} size={22} />
      </span>
      <h3 className="text-h4 text-content-primary">{pick(point.title)}</h3>
      <p className="text-body-sm text-content-secondary">{pick(point.description)}</p>
    </div>
  );
}
