import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Icon, type IconName } from '../components/icons/Icon';
import { fadeInUp, staggerContainer, toReducedMotion } from '../motion/animation';
import { useReducedMotion } from '../motion/useReducedMotion';
import { useLanguage } from '../i18n/LanguageProvider';
import type { TranslationKey } from '../i18n/translations';

const TRUST: { value: string; label: TranslationKey; icon: IconName }[] = [
  { value: '240+', label: 'hero.trust1', icon: 'shield-check' },
  { value: '1,800+', label: 'hero.trust2', icon: 'solar-panel' },
  { value: '4.8 / 5', label: 'hero.trust3', icon: 'users' },
];

/** Twelve-hour output curve; the three amber bars mark solar noon. */
const SPARK = [14, 22, 34, 48, 62, 74, 80, 72, 58, 40, 26, 16];

export function Hero() {
  const prefersReduced = useReducedMotion();
  const { t } = useLanguage();
  const container = prefersReduced ? toReducedMotion(staggerContainer) : staggerContainer;
  const item = prefersReduced ? toReducedMotion(fadeInUp) : fadeInUp;

  return (
    <section id="top" className="on-dark relative overflow-hidden bg-bg-inverse">
      {/* Sunset glow, upper right — the light source for the whole page. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-20%] top-[-60%] h-[1100px] w-[1500px]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(242,172,46,0.34) 0%, rgba(212,86,51,0.18) 42%, transparent 100%)',
        }}
      />
      {/* Cool dusk counterweight, lower left. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-30%] top-[30%] h-[820px] w-[1100px]"
        style={{ background: 'radial-gradient(closest-side, rgba(77,92,134,0.30) 0%, transparent 100%)' }}
      />

      <div className="container-page relative grid items-center gap-12 py-16 md:py-20 lg:grid-cols-[1fr_minmax(0,596px)] lg:gap-14 lg:py-24">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-6"
        >
          <motion.p
            variants={item}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-line-on-dark bg-bg-panel-raised py-1.5 ps-2 pe-3.5 text-label text-content-on-dark-muted"
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[7px] bg-[var(--brand-subtle)] text-content-brand">
              <Icon name="zap" size={13} />
            </span>
            {t('hero.pill')}
          </motion.p>

          <motion.h1 variants={item} className="max-w-[20ch] text-display-xl text-content-on-dark">
            {t('hero.h1')}
          </motion.h1>

          <motion.p variants={item} className="max-w-[54ch] text-body-lg text-content-on-dark-muted">
            {t('hero.sub')}
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap items-center gap-3.5">
            <Button
              trailingArrow
              onClick={() => document.getElementById('calculator')?.scrollIntoView()}
            >
              {t('hero.cta1')}
            </Button>
            <Button
              variant="onDark"
              onClick={() => document.getElementById('projects')?.scrollIntoView()}
            >
              {t('hero.cta2')}
            </Button>
          </motion.div>

          <motion.ul variants={item} className="mt-3 flex flex-wrap gap-x-8 gap-y-4">
            {TRUST.map((s) => (
              <li key={s.label} className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-bg-panel-raised text-solar-300">
                  <Icon name={s.icon} size={16} />
                </span>
                <span>
                  <span className="numeric block text-label text-content-on-dark">{s.value}</span>
                  <span className="block text-label-sm text-content-on-dark-muted">
                    {t(s.label)}
                  </span>
                </span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Hero visual: sunset sky over a photovoltaic array, with live data.
            The illustration is composed LTR and stays that way; the two data
            cards on top follow the page direction. */}
        <motion.div
          dir="ltr"
          role="img"
          aria-label={t('a11y.heroVisual')}
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReduced ? 0.01 : 0.6,
            ease: [0.43, 0.13, 0.23, 0.96],
            delay: 0.15,
          }}
          className="relative aspect-[596/460] w-full overflow-hidden rounded-2xl border border-line-on-dark"
          style={{ backgroundImage: 'linear-gradient(150deg, #3c5e6e 0%, #16242d 45%, #0a0f13 100%)' }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[44%]"
            style={{
              background:
                'linear-gradient(180deg, rgba(239,154,124,0.62) 0%, rgba(212,86,51,0.32) 45%, transparent 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute h-[22.6%] w-[17.4%] rounded-full"
            style={{
              left: '64.8%',
              top: '9.6%',
              backgroundImage: 'linear-gradient(180deg, #fff8ea 0%, #f7c55f 55%, #e5754f 100%)',
              boxShadow: '0 0 64px 8px rgba(242,172,46,0.5)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 top-[45.6%] overflow-hidden"
            style={{ backgroundImage: 'linear-gradient(160deg, #294451 0%, #111a21 50%, #0a0f13 100%)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, rgba(187,196,220,0.16) 0 1.2px, transparent 1.2px 26px),' +
                  'repeating-linear-gradient(to right, rgba(187,196,220,0.2) 0 1.2px, transparent 1.2px 56px)',
              }}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/2"
              style={{
                background:
                  'linear-gradient(150deg, rgba(247,197,95,0.42) 0%, rgba(212,86,51,0.12) 60%, transparent 100%)',
              }}
            />
          </div>

          {/* live output card */}
          <div
            dir="inherit"
            className="absolute left-[4%] top-[6.5%] rounded-lg border border-panel-400 p-4 shadow-panel backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(10,15,19,0.85)' }}
          >
            <p className="flex items-center gap-2 text-label-sm text-content-on-dark-muted">
              <Icon name="trending-up" size={15} className="shrink-0 text-solar-300" />
              {t('hero.live')}
            </p>
            <p className="mt-2 flex items-baseline gap-1.5">
              <span className="numeric text-data-l text-content-on-dark">6.2</span>
              <span className="text-label text-content-on-dark-muted">kW</span>
            </p>
            <div className="mt-3 flex h-20 items-end gap-1" aria-hidden="true">
              {SPARK.map((h, i) => (
                <span
                  key={i}
                  className={i >= 5 && i <= 7 ? 'rounded-sm bg-solar-400' : 'rounded-sm bg-dusk-500'}
                  style={{ width: 7, height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* recommendation chip */}
          <div
            dir="inherit"
            className="absolute bottom-[8%] right-[4%] flex items-center gap-2.5 rounded-[12px] px-4 py-3 shadow-lg"
            style={{ backgroundColor: 'rgba(253,250,246,0.95)' }}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[var(--brand-subtle)] text-content-brand">
              <Icon name="solar-panel" size={18} />
            </span>
            <span>
              <span className="block text-label text-content-primary">{t('hero.rec')}</span>
              <span className="block text-label-sm text-content-tertiary">{t('hero.recSub')}</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
