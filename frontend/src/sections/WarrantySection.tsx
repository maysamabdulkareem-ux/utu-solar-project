import { Icon } from '../components/icons/Icon';
import { WarrantyCard } from '../components/cards/WarrantyCard';
import { Reveal, RevealItem } from '../motion/Reveal';
import { warranties } from '../data/content';
import { useLanguage } from '../i18n/LanguageProvider';

export function WarrantySection() {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="warranty-heading" className="section-y bg-bg-page">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <p className="eyebrow text-[var(--color-sunset-500)]">{t('wa.eyebrow')}</p>
          <h2 id="warranty-heading" className="mt-3 text-h1 text-content-primary">
            {t('wa.h2')}
          </h2>
          <p className="mt-3 text-body-lg text-content-secondary">{t('wa.lede')}</p>
        </Reveal>

        <Reveal stagger as="ul" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {warranties.map((w) => (
            <RevealItem key={w.id} as="li" className="h-full">
              <WarrantyCard warranty={w} />
            </RevealItem>
          ))}
        </Reveal>

        <Reveal className="mt-6 flex items-start gap-2.5 rounded-lg border border-line-subtle bg-bg-subtle px-5 py-4">
          <Icon name="file-check" size={18} className="mt-0.5 shrink-0 text-content-brand" />
          <p className="text-body-sm text-content-secondary">{t('wa.note')}</p>
        </Reveal>
      </div>
    </section>
  );
}
