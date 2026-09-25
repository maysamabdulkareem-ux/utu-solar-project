import { TrustItem } from '../components/cards/TrustItem';
import { Reveal, RevealItem } from '../motion/Reveal';
import { trustPoints } from '../data/content';
import { useLanguage } from '../i18n/LanguageProvider';

export function Trust() {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="trust-heading" className="section-y bg-bg-subtle">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-[var(--color-sunset-500)]">{t('tr.eyebrow')}</p>
          <h2 id="trust-heading" className="mt-3 text-h1 text-content-primary">
            {t('tr.h2')}
          </h2>
        </Reveal>

        <Reveal stagger as="ul" className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point) => (
            <RevealItem key={point.id} as="li">
              <TrustItem point={point} />
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
