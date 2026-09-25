import { Button } from '../components/ui/Button';
import { CompanyCard } from '../components/cards/CompanyCard';
import { Reveal, RevealItem } from '../motion/Reveal';
import { useCompanies } from '../api/useCompanies';
import { useLanguage } from '../i18n/LanguageProvider';

export function Companies() {
  const { t } = useLanguage();
  const { companies } = useCompanies();

  return (
    <section id="companies" aria-labelledby="companies-heading" className="section-y bg-bg-subtle">
      <div className="container-page">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow text-[var(--color-sunset-500)]">{t('co.eyebrow')}</p>
            <h2 id="companies-heading" className="mt-3 text-h1 text-content-primary">
              {t('co.h2')}
            </h2>
            <p className="mt-3 text-body-lg text-content-secondary">{t('co.lede')}</p>
          </div>
          <Button variant="secondary" size="md" trailingArrow>
            {t('co.viewAll')}
          </Button>
        </Reveal>

        <Reveal stagger as="ul" className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <RevealItem key={company.id} as="li" className="h-full">
              <CompanyCard company={company} />
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
