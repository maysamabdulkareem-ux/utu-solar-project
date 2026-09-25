import { ReviewCard } from '../components/cards/ReviewCard';
import { Reveal, RevealItem } from '../motion/Reveal';
import { reviews } from '../data/content';
import { useLanguage } from '../i18n/LanguageProvider';

export function Reviews() {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="reviews-heading" className="section-y bg-bg-subtle">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-[var(--color-sunset-500)]">{t('rv.eyebrow')}</p>
          <h2 id="reviews-heading" className="mt-3 text-h1 text-content-primary">
            {t('rv.h2')}
          </h2>
          <p className="mt-3 text-body-lg text-content-secondary">{t('rv.lede')}</p>
        </Reveal>

        <Reveal stagger as="ul" className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review) => (
            <RevealItem key={review.id} as="li" className="h-full">
              <ReviewCard review={review} />
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
