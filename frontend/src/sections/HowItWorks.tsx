import { StepCard } from '../components/cards/StepCard';
import { Reveal, RevealItem } from '../motion/Reveal';
import { steps } from '../data/content';
import { useLanguage } from '../i18n/LanguageProvider';

export function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="section-y bg-bg-page">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-[var(--color-sunset-500)]">{t('how.eyebrow')}</p>
          <h2 id="how-heading" className="mt-3 text-h1 text-content-primary">
            {t('how.h2')}
          </h2>
        </Reveal>

        <Reveal stagger as="ol" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <RevealItem key={step.number} as="li" className="h-full">
              <StepCard step={step} />
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
