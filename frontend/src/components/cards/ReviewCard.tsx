import { Chip } from '../ui/Chip';
import { Rating } from '../ui/Rating';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Review } from '../../data/content';
import { Icon } from '../icons/Icon';

/**
 * Customer review. Deliberately plain — no oversized quote glyphs or portrait
 * photography, both of which read as testimonial decoration rather than
 * evidence.
 */
export function ReviewCard({ review }: { review: Review }) {
  const { t, pick } = useLanguage();

  return (
    <figure className="flex h-full flex-col gap-4 rounded-xl border border-line-subtle bg-bg-surface p-6">
      <figcaption className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--color-dusk-50)] text-label text-[var(--color-dusk-500)]"
        >
          {pick(review.initials)}
        </span>
        <span className="min-w-0">
          <span className="block text-label text-content-primary">{pick(review.name)}</span>
          <span className="block text-label-sm text-content-tertiary">{pick(review.role)}</span>
        </span>
      </figcaption>

      {review.isVerified && (
        <p className="flex items-center gap-1.5 text-label-sm font-semibold text-[var(--status-success)]">
          <Icon name="shield-check" size={15} />
          {t('rv.verified')}
        </p>
      )}

      <Rating score={review.rating} />

      <blockquote className="text-body text-content-secondary">{pick(review.body)}</blockquote>

      <dl className="mt-auto grid gap-2 border-t border-line-subtle pt-4 text-label-sm">
        {review.projectTitle && (
          <div>
            <dt className="text-content-tertiary">{t('rv.project')}</dt>
            <dd className="text-label text-content-primary">{pick(review.projectTitle)}</dd>
          </div>
        )}
        {review.location && (
          <div>
            <dt className="text-content-tertiary">{t('rv.location')}</dt>
            <dd className="text-label text-content-primary">{pick(review.location)}</dd>
          </div>
        )}
        {review.companyName && (
          <div>
            <dt className="text-content-tertiary">{t('rv.company')}</dt>
            <dd className="text-label text-content-primary">{pick(review.companyName)}</dd>
          </div>
        )}
      </dl>
      <Chip className="w-fit">{pick(review.projectType)}</Chip>
    </figure>
  );
}
