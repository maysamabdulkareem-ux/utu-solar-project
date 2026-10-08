import { useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { CompanyCard } from '../components/cards/CompanyCard';
import { Reveal, RevealItem } from '../motion/Reveal';
import { useCompanies } from '../api/useCompanies';
import { useLanguage } from '../i18n/LanguageProvider';
import type { Variants } from 'framer-motion';

const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.43, 0.13, 0.23, 0.96] } },
};

export function Companies() {
  const { t, lang } = useLanguage();
  const { companies, source } = useCompanies();
  const rankedCompanies = useMemo(
    () => [...companies].sort((a, b) => b.rating - a.rating || b.reviews - a.reviews || a.name.en.localeCompare(b.name.en)),
    [companies],
  );
  const topCompanies = rankedCompanies.slice(0, 6);

  return (
    <section id="companies" aria-labelledby="companies-heading" className="section-y bg-bg-subtle">
      <div className="container-page">
        <Reveal className="max-w-2xl">
          <div className="max-w-2xl">
            <p className="eyebrow font-bold tracking-wider text-amber-600">{t('co.eyebrow')}</p>
            <h2 id="companies-heading" className="mt-3 text-h1 font-extrabold tracking-tight text-slate-900">
              {t('co.h2')}
            </h2>
            <p className="mt-3 text-body-lg text-slate-600">{t('co.lede')}</p>
          </div>
        </Reveal>

        {topCompanies.length > 0 ? (
          <Reveal stagger as="ul" className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {topCompanies.map((company) => (
              <RevealItem key={company.id} as="li" className="h-full" variants={slideFromLeft}>
                <CompanyCard company={company} />
              </RevealItem>
            ))}
          </Reveal>
        ) : (
          <p role="status" className="mt-8 border-y border-line-subtle py-6 text-body text-content-secondary">
            {source === 'loading'
              ? (lang === 'ar' ? 'جارٍ تحميل الشركات…' : 'Loading installers…')
              : source === 'unavailable'
                ? (lang === 'ar' ? 'تعذّر تحميل الشركات حالياً. حاول مرة ثانية لاحقاً.' : 'Companies could not be loaded. Please try again later.')
                : (lang === 'ar' ? 'ماكو شركات مسجلة ومتاحة حالياً.' : 'No registered companies are available yet.')}
          </p>
        )}
        {rankedCompanies.length > 6 && (
          <div className="relative mt-8 h-44 overflow-hidden rounded-2xl" data-testid="company-peek-pocket">
            <ul aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => {
                const company = rankedCompanies[6 + index];
                return (
                  <li key={company?.id ?? `company-preview-placeholder-${index}`}>
                    {company ? (
                      <CompanyCard company={company} interactive={false} />
                    ) : (
                      <div aria-hidden="true" className="h-64 rounded-2xl border border-amber-500/15 bg-[#0A1128]/70" />
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-t from-slate-100 via-slate-100/70 to-transparent px-4 pt-10 backdrop-blur-[2px]">
              <Button
                variant="primary"
                size="md"
                trailingArrow
                className="pointer-events-auto rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg transition-all hover:from-amber-600 hover:to-orange-600 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                onClick={() => { window.location.hash = '#/companies'; window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {lang === 'ar' ? 'اكتشف المزيد من الشركات' : 'Discover More Companies'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
