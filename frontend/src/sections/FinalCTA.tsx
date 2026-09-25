import { Button } from '../components/ui/Button';
import { Reveal } from '../motion/Reveal';
import { useLanguage } from '../i18n/LanguageProvider';

export function FinalCTA() {
  const { t } = useLanguage();

  return (
    <section aria-labelledby="cta-heading" className="on-dark relative overflow-hidden bg-bg-inverse">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[-40%] h-[900px] w-[1200px] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(closest-side, rgba(242,172,46,0.24) 0%, rgba(212,86,51,0.10) 50%, transparent 100%)',
        }}
      />
      {/* A thin panel lattice grounds the section without another image. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-60"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(187,196,220,0.10) 0 1px, transparent 1px 24px),' +
            'repeating-linear-gradient(to right, rgba(187,196,220,0.12) 0 1px, transparent 1px 52px)',
        }}
      />

      <Reveal className="container-page relative flex flex-col items-center gap-6 py-20 text-center lg:py-24">
        <h2 id="cta-heading" className="max-w-[24ch] text-display-l text-content-on-dark">
          {t('fcta.h2')}
        </h2>
        <p className="max-w-[56ch] text-body-lg text-content-on-dark-muted">{t('fcta.p')}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3.5">
          <Button
            trailingArrow
            onClick={() => document.getElementById('calculator')?.scrollIntoView()}
          >
            {t('fcta.b1')}
          </Button>
          <Button
            variant="onDark"
            onClick={() => document.getElementById('companies')?.scrollIntoView()}
          >
            {t('fcta.b2')}
          </Button>
        </div>
      </Reveal>
    </section>
  );
}
