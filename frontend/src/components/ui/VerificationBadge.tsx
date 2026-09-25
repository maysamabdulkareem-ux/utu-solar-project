import { cn } from '../../lib/cn';
import { Icon, type IconName } from '../icons/Icon';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';

export type VerificationStatus = 'verified' | 'pending' | 'rejected';

/**
 * Marketplace trust signal.
 *
 * Status is carried by THREE channels — icon shape, wording and colour — so it
 * survives greyscale printing and colour-blind viewing. Never reduce this to a
 * coloured dot.
 */
const CONFIG: Record<
  VerificationStatus,
  { icon: IconName; label: TranslationKey; desc: TranslationKey; className: string }
> = {
  verified: {
    icon: 'shield-check',
    label: 'badge.verified',
    desc: 'badge.verifiedDesc',
    className:
      'text-[var(--status-success)] bg-[var(--status-success-bg)] border-[var(--status-success)]',
  },
  pending: {
    icon: 'clock',
    label: 'badge.pending',
    desc: 'badge.pendingDesc',
    className:
      'text-[var(--status-warning)] bg-[var(--status-warning-bg)] border-[var(--status-warning)]',
  },
  rejected: {
    icon: 'x-mark',
    label: 'badge.rejected',
    desc: 'badge.rejectedDesc',
    className:
      'text-[var(--status-danger)] bg-[var(--status-danger-bg)] border-[var(--status-danger)]',
  },
};

export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const { t } = useLanguage();
  const cfg = CONFIG[status];
  const label = t(cfg.label);
  const desc = t(cfg.desc);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border py-1 ps-2.5 pe-3 text-label-sm',
        cfg.className,
        className,
      )}
      title={desc}
    >
      <Icon name={cfg.icon} size={14} />
      {label}
      <span className="sr-only"> — {desc}</span>
    </span>
  );
}
