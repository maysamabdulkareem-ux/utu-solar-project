import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { useLanguage, fmt } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';
import { buildOptimizations, type SystemTier } from '../../ai/solarAssessment';
import type { SolarEstimate } from '../calculator/useSolarEstimate';

/** The bonus "Optimize My System" interaction — before/after, nothing applied automatically. */
export function OptimizeSystem({ estimate, tier }: { estimate: SolarEstimate; tier: SystemTier }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const options = buildOptimizations(estimate, tier);

  return (
    <>
      <div className="flex justify-center border-t border-line-subtle py-10">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          {t('ai.optimize.button')}
        </Button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // The backdrop IS the scroll container: it fills the viewport, scrolls on
            // its own when the dialog is taller than the screen, and centers the
            // dialog with ordinary flow (not a top:50%/-translate-y-1/2 trick, which
            // framer-motion's own y-animation transform would silently cancel out).
            className="fixed inset-0 z-40 overflow-y-auto bg-black/30 p-4"
            onClick={() => setOpen(false)}
          >
            <div className="flex min-h-full items-center justify-center">
              <motion.div
                role="dialog"
                aria-label={t('ai.optimize.title')}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                onClick={(e) => e.stopPropagation()}
                className="my-8 w-full max-w-xl rounded-2xl border border-line-subtle bg-bg-surface p-6 shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-h4 text-content-primary">{t('ai.optimize.title')}</h2>
                    <p className="mt-1 text-body-sm text-content-secondary">{t('ai.optimize.intro', { n: options.length })}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t('ai.optimize.close')}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-content-tertiary hover:bg-bg-subtle"
                  >
                    <Icon name="x-mark" size={16} />
                  </button>
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  {options.map((opt, i) => (
                    <div key={opt.id} className="rounded-xl border border-line-subtle p-4">
                      <p className="text-label font-semibold text-content-primary">
                        {t(`ai.optimize.option${i + 1}.title` as TranslationKey)}
                      </p>
                      <ul className="mt-1.5 flex flex-col gap-1 text-label-sm text-content-secondary">
                        <li className="flex items-center gap-1.5">
                          <Icon name="trending-up" size={13} className="text-content-brand" />
                          {t(`ai.optimize.option${i + 1}.effect1` as TranslationKey)}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Icon name="trending-up" size={13} className="rotate-180 text-content-tertiary" />
                          {t(`ai.optimize.option${i + 1}.effect2` as TranslationKey)}
                        </li>
                      </ul>

                      <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-bg-subtle p-3 text-label-sm">
                        <div>
                          <p className="text-content-tertiary">{t('ai.optimize.before')}</p>
                          <p className="numeric mt-0.5 text-content-primary">{fmt.int(opt.before.costIQD)} IQD</p>
                          <p className="numeric text-content-tertiary">
                            {fmt.dec(opt.before.backupHours)} h · {opt.before.solarCoveragePct}%
                          </p>
                        </div>
                        <div>
                          <p className="text-content-brand">{t('ai.optimize.after')}</p>
                          <p className="numeric mt-0.5 text-content-brand">{fmt.int(opt.after.costIQD)} IQD</p>
                          <p className="numeric text-content-brand/80">
                            {fmt.dec(opt.after.backupHours)} h · {opt.after.solarCoveragePct}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
