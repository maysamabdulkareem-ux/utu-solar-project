import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../icons/Icon';
import { useLanguage } from '../../i18n/LanguageProvider';
import { useReducedMotion } from '../../motion/useReducedMotion';

const STEP_KEYS = [
  'ai.analyzing.step1',
  'ai.analyzing.step2',
  'ai.analyzing.step3',
  'ai.analyzing.step4',
  'ai.analyzing.step5',
  'ai.analyzing.step6',
  'ai.analyzing.step7',
] as const;

const STEP_DELAY_MS = 420;
const HOLD_AFTER_MS = 700;

/**
 * The intermediate screen between "Calculate" and the AI recommendations.
 *
 * Each line checks off on its own beat rather than all at once — real enough
 * to read as work happening, short enough (under 3.5s total) that it never
 * reads as a stalled loading spinner. Respects reduced-motion by checking
 * everything off immediately and holding briefly before continuing.
 */
export function AnalyzingScreen({ onDone }: { onDone: () => void }) {
  const { t } = useLanguage();
  const prefersReduced = useReducedMotion();
  const [doneCount, setDoneCount] = useState(prefersReduced ? STEP_KEYS.length : 0);

  useEffect(() => {
    if (prefersReduced) {
      const timer = window.setTimeout(onDone, HOLD_AFTER_MS);
      return () => window.clearTimeout(timer);
    }

    let i = 0;
    const interval = window.setInterval(() => {
      i += 1;
      setDoneCount(i);
      if (i >= STEP_KEYS.length) {
        window.clearInterval(interval);
        window.setTimeout(onDone, HOLD_AFTER_MS);
      }
    }, STEP_DELAY_MS);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefersReduced]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        <span
          aria-hidden="true"
          className="mx-auto grid h-16 w-16 place-items-center rounded-full border-[1.5px] border-line-brand bg-bg-panel-raised text-solar-300"
        >
          <motion.span
            animate={prefersReduced ? undefined : { rotate: 360 }}
            transition={prefersReduced ? undefined : { duration: 2.2, repeat: Infinity, ease: 'linear' }}
            className="grid h-full w-full place-items-center"
          >
            <Icon name="zap" size={28} />
          </motion.span>
        </span>

        <h1 className="mt-6 text-h2 text-content-primary">{t('ai.analyzing.title')}</h1>
        <p className="mx-auto mt-2 max-w-md text-body text-content-secondary">
          {t('ai.analyzing.subtitle')}
        </p>

        <ul role="status" aria-live="polite" className="mx-auto mt-8 flex max-w-sm flex-col gap-3 text-start">
          {STEP_KEYS.map((key, i) => {
            const isDone = i < doneCount;
            const isActive = i === doneCount;
            return (
              <motion.li
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isDone || isActive ? 1 : 0.35, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 rounded-lg border border-line-subtle bg-bg-surface px-4 py-3"
              >
                <span
                  className={
                    isDone
                      ? 'grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]'
                      : 'grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line-subtle text-content-tertiary'
                  }
                >
                  {isDone ? (
                    <Icon name="check" size={14} />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span className="text-label-sm text-content-secondary">{t(key)}</span>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
