import { Chip } from '../ui/Chip';
import { Rating } from '../ui/Rating';
import { useLanguage } from '../../i18n/LanguageProvider';
import type { Review } from '../../data/content';

/**
 * Customer review. Deliberately plain — no oversized quote glyphs or portrait
 * photography, both of which read as testimonial decoration rather than
 * evidence.
 */
export function ReviewCard({ review }: { review: Review }) {
  const { pick } = useLanguage();

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

      <Rating score={review.rating} />

      <blockquote className="text-body text-content-secondary">{pick(review.body)}</blockquote>

      <Chip className="mt-auto w-fit">{pick(review.projectType)}</Chip>
    </figure>
  );
}
