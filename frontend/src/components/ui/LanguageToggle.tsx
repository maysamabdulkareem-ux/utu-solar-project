import { cn } from '../../lib/cn';
import { LANGS } from '../../i18n/translations';
import { useLanguage } from '../../i18n/LanguageProvider';

/**
 * EN ⇄ AR switch.
 *
 * The button shows the language it switches TO, labelled in that language —
 * the convention people already recognise from bilingual Iraqi sites. The
 * label carries its own `lang` attribute so a screen reader changes voice for
 * it instead of spelling Arabic out in English phonemes.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, t, toggle } = useLanguage();
  const next = lang === 'en' ? 'ar' : 'en';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('a11y.switchLang')}
      className={cn(
        'inline-flex min-h-10 items-center gap-2 rounded-full border border-line-on-dark',
        'bg-bg-panel-raised px-3.5 py-2 text-[0.8125rem] font-semibold text-content-on-dark',
        'transition-colors hover:border-solar-400 hover:bg-panel-600',
        className,
      )}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 text-solar-300"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3.2 9h17.6M3.2 15h17.6" />
        <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
      </svg>
      <span lang={next}>{LANGS[next].nativeName}</span>
    </button>
  );
}
