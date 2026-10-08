import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../icons/Icon';
import { useLanguage, fmt } from '../../i18n/LanguageProvider';
import {
  answerQuickQuestion,
  type QuickQuestionId,
  type SystemTier,
  type AssessmentInsight,
} from '../../ai/solarAssessment';
import type { SolarEstimate } from '../calculator/useSolarEstimate';

/** Fields that are whole IQD amounts — formatted with thousands separators before going into a sentence. */
const IQD_FIELDS = new Set(['iqd', 'savingIQD']);
/** Fields that are decimal quantities (kWp/kW/kWh) — one decimal place. */
const DECIMAL_FIELDS = new Set(['panelKWp', 'inverterKW', 'batteryKWh']);

function formatVars(vars: Record<string, number | string>): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(vars)) {
    if (typeof value !== 'number') {
      out[key] = value;
    } else if (IQD_FIELDS.has(key)) {
      out[key] = fmt.int(value);
    } else if (DECIMAL_FIELDS.has(key)) {
      out[key] = fmt.dec(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

const QUICK_QUESTIONS: QuickQuestionId[] = [
  'whyThisSystem',
  'whyBattery',
  'whyInverter',
  'reduceCost',
  'addAnotherAC',
  'backupHours',
  'whichCompanies',
];

type ChatEntry = { from: 'assistant' | 'user'; text: string };

/**
 * Contextual AI Solar Assistant — a side panel on desktop, a bottom sheet on
 * mobile. Not a general chatbot: every quick question is answered from this
 * specific assessment's own numbers via `answerQuickQuestion`, so answers can
 * be swapped for a real model later without changing this component's shape.
 */
export function AIAssistant({
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
  const [messages, setMessages] = useState<ChatEntry[]>([{ from: 'assistant', text: t('ai.assistant.opening') }]);
  const [freeText, setFreeText] = useState('');
  // The quick-question list collapses behind a "more questions" button once
  // one has been answered, so the latest answer stays in view instead of
  // being pushed down by seven buttons every time.
  const [showQuick, setShowQuick] = useState(true);

  const ask = (id: QuickQuestionId) => {
    const vars = formatVars(answerQuickQuestion(id, { estimate, tier, insight, companyCount }));
    const answer = t(`ai.assistant.a.${id}` as const, vars);
    setMessages((m) => [...m, { from: 'user', text: t(`ai.assistant.q.${id}` as const) }, { from: 'assistant', text: answer }]);
    setShowQuick(false);
  };

  const sendFree = () => {
    const text = freeText.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: 'user', text }, { from: 'assistant', text: t('ai.assistant.fallback') }]);
    setFreeText('');
    setShowQuick(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 end-6 z-40 flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-5 py-3.5 text-label font-semibold text-content-on-brand shadow-lg transition-colors hover:bg-[var(--brand-primary-hover)]"
      >
        {t('ai.assistant.entry')}
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
              aria-label={t('ai.assistant.title')}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-line-subtle bg-bg-surface shadow-lg sm:inset-auto sm:bottom-6 sm:end-6 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:border"
            >
              <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4">
                <h2 className="text-label font-semibold text-content-primary">{t('ai.assistant.title')}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('ai.assistant.close')}
                  className="grid h-8 w-8 place-items-center rounded-full text-content-tertiary hover:bg-bg-subtle"
                >
                  <Icon name="x-mark" size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <ul className="flex flex-col gap-3">
                  {messages.map((m, i) => (
                    <li
                      key={i}
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
                    <p className="mb-2.5 text-label-sm font-medium text-content-tertiary">{t('ai.assistant.quickTitle')}</p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_QUESTIONS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => ask(id)}
                          className="rounded-full border border-line-subtle px-3 py-1.5 text-label-sm text-content-secondary transition-colors hover:border-line-brand hover:text-content-brand"
                        >
                          {t(`ai.assistant.q.${id}` as const)}
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
                    {t('ai.assistant.moreQuestions')}
                  </button>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendFree()}
                    placeholder={t('ai.assistant.typeQuestion')}
                    className="min-w-0 flex-1 rounded-md border border-line-subtle bg-bg-page px-3 py-2 text-body-sm text-content-primary outline-none focus-visible:border-line-brand"
                  />
                  <button
                    type="button"
                    onClick={sendFree}
                    className="shrink-0 rounded-md bg-[var(--brand-primary)] px-3.5 py-2 text-label-sm font-semibold text-content-on-brand"
                  >
                    {t('ai.assistant.send')}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
