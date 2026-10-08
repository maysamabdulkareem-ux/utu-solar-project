import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../icons/Icon';
import { fmt, useLanguage } from '../../i18n/LanguageProvider';
import type { TranslationKey } from '../../i18n/translations';
import {
  answerQuickQuestion,
  QUICK_QUESTIONS,
  type AnswerValues,
  type AssessmentInsight,
  type QuickQuestionId,
  type SystemTier,
} from '../../assessment/utuAssessment';
import type { SolarEstimate } from '../calculator/useSolarEstimate';

/** Whole IQD amounts get thousands separators; kW/kWh values one decimal. */
const IQD_FIELDS = new Set(['iqd', 'savingIQD']);
const DECIMAL_FIELDS = new Set(['panelKWp', 'inverterKW', 'batteryKWh', 'backup']);

function formatValues(values: AnswerValues): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(values)) {
    out[key] = IQD_FIELDS.has(key) ? fmt.int(value) : DECIMAL_FIELDS.has(key) ? fmt.dec(value) : value;
  }
  return out;
}

type ChatEntry = { from: 'assistant' | 'user'; text: string };

/**
 * UTU assistant on the assessment page — a side panel on desktop, a bottom
 * sheet on mobile. Not a general chatbot: each quick question is answered
 * from this assessment's own numbers by `answerQuickQuestion`. A real AI
 * provider can replace those answers later without changing this shape.
 */
export function UtuAssistant({
  estimate,
  tier,
  insight,
  companyCount,
}: {
  estimate: SolarEstimate;
  tier: SystemTier;
  insight: AssessmentInsight;
  companyCount: number;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState<{ id: QuickQuestionId; values: AnswerValues; answerKey: TranslationKey }[]>([]);
  // Once a question is answered the list folds away so the answer stays in view.
  const [showQuick, setShowQuick] = useState(true);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const endRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [asked.length]);

  const ask = (id: QuickQuestionId) => {
    const values = answerQuickQuestion(id, { estimate, tier, insight, companyCount });
    const answerKey: TranslationKey = id === 'reduceCost' && tier.id === 'economy'
      ? 'as.assistant.a.reduceCostAlready'
      : `as.assistant.a.${id}`;
    setAsked((list) => [...list, { id, values, answerKey }]);
    setShowQuick(false);
  };

  // Answers are rendered at display time so switching language re-translates them.
  const messages: ChatEntry[] = [
    { from: 'assistant', text: t('as.assistant.opening') },
    ...asked.flatMap(({ id, values, answerKey }): ChatEntry[] => [
      { from: 'user', text: t(`as.assistant.q.${id}`) },
      { from: 'assistant', text: t(answerKey, formatValues(values)) },
    ]),
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 end-6 z-40 flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-5 py-3.5 text-label font-semibold text-content-on-brand shadow-lg transition-colors hover:bg-[var(--brand-primary-hover)]"
      >
        <Icon name="zap" size={17} />
        {t('as.assistant.entry')}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="utu-assistant-title"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-line-subtle bg-bg-surface shadow-lg sm:inset-auto sm:bottom-6 sm:end-6 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:border"
            >
              <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
                <h2 id="utu-assistant-title" className="text-label font-semibold text-content-primary">{t('as.assistant.title')}</h2>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('as.assistant.close')}
                  className="grid h-8 w-8 place-items-center rounded-full text-content-tertiary hover:bg-bg-subtle"
                >
                  <Icon name="x-mark" size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
                <ul className="flex flex-col gap-3">
                  {messages.map((m, i) => (
                    <li
                      key={i}
                      ref={i === messages.length - 1 ? endRef : undefined}
                      className={
                        m.from === 'assistant'
                          ? 'max-w-[90%] rounded-xl rounded-ss-sm bg-bg-subtle px-3.5 py-2.5 text-body-sm text-content-primary'
                          : 'ms-auto max-w-[90%] rounded-xl rounded-se-sm bg-[var(--brand-primary)] px-3.5 py-2.5 text-body-sm text-content-on-brand'
                      }
                    >
                      {m.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-line-subtle px-5 py-4">
                {showQuick ? (
                  <>
                    <p className="mb-2.5 text-label-sm font-medium text-content-tertiary">{t('as.assistant.quickTitle')}</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_QUESTIONS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => ask(id)}
                          className="rounded-full border border-line-subtle px-3 py-1.5 text-label-sm text-content-secondary transition-colors hover:border-line-brand hover:text-content-brand"
                        >
                          {t(`as.assistant.q.${id}`)}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowQuick(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-line-subtle px-3 py-2 text-label-sm font-medium text-content-brand transition-colors hover:border-line-brand"
                  >
                    <Icon name="chevron-down" size={14} />
                    {t('as.assistant.moreQuestions')}
                  </button>
                )}
                <p className="mt-3 text-[0.75rem] leading-snug text-content-tertiary">{t('as.assistant.note')}</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
