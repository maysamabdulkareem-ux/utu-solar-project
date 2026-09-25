import { cn } from '../../lib/cn';
import { Icon } from '../icons/Icon';
import { useLanguage } from '../../i18n/LanguageProvider';

/**
 * Stars never carry the score alone — the numeric value is always rendered and
 * the whole control exposes an aria-label, so the rating survives greyscale and
 * screen readers. The star row stays left-to-right in both languages: a 5-star
 * scale reads the same way everywhere.
 */
export function Rating({
  score,
  reviewCount,
  size = 15,
  className,
}: {
  score: number;
  reviewCount?: number;
  size?: number;
  className?: string;
}) {
  const { t } = useLanguage();
  const filled = Math.round(score);
  const label =
    reviewCount !== undefined
      ? t('rate.ariaCount', { s: score, c: reviewCount })
      : t('rate.aria', { s: score });

  return (
    <div className={cn('flex items-center gap-2', className)} role="img" aria-label={label}>
      <span className="flex items-center gap-0.5 ltr" dir="ltr" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <Icon
            key={i}
            name="star"
            size={size}
            className={i < filled ? 'text-solar-500' : 'text-sand-300'}
          />
        ))}
      </span>
      <span className="numeric text-label text-content-primary" aria-hidden="true">
        {score.toFixed(1)}
      </span>
      {reviewCount !== undefined && (
        <span className="text-label-sm text-content-tertiary" aria-hidden="true">
          {t('rate.reviews', { c: reviewCount })}
        </span>
      )}
    </div>
  );
}
