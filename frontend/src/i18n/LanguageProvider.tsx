import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LANGS, translations, type Lang, type TranslationKey } from './translations';

/** A field that exists in both languages. Used for listing content. */
export type Localized<T> = Record<Lang, T>;

type Vars = Record<string, string | number>;

type LanguageValue = {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  isRTL: boolean;
  /** Translate a UI string, filling {placeholders}. */
  t: (key: TranslationKey, vars?: Vars) => string;
  /** Read the current language out of a Localized value. */
  pick: <T>(value: Localized<T>) => T;
  setLang: (next: Lang) => void;
  toggle: () => void;
};

const LanguageContext = createContext<LanguageValue | null>(null);

const STORAGE_KEY = 'utu-lang';

function readStored(): Lang | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'ar' || v === 'en' ? v : null;
  } catch {
    // Private window, blocked site data — fall through to the default.
    return null;
  }
}

/**
 * Owns the site language.
 *
 * Writes `lang` and `dir` onto <html> so CSS can key off them: the font family,
 * line-height and letter-spacing tokens all switch on `:root[lang="ar"]`, and
 * Tailwind's `rtl:` variants key off `dir`. That keeps mirroring in the
 * stylesheet instead of scattering conditionals through components.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStored() ?? 'en');

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', LANGS[lang].dir);
    document.title = lang === 'ar' ? 'أوتو — منصة الطاقة الشمسية' : 'Utu Marketplace';
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting the choice is a convenience, never load-bearing.
    }
  }, []);

  const value = useMemo<LanguageValue>(() => {
    const t = (key: TranslationKey, vars?: Vars) => {
      let s: string = translations[lang][key] ?? translations.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      }
      return s;
    };
    return {
      lang,
      dir: LANGS[lang].dir,
      isRTL: lang === 'ar',
      t,
      pick: <T,>(v: Localized<T>) => v[lang],
      setLang,
      toggle: () => setLang(lang === 'en' ? 'ar' : 'en'),
    };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
}

/**
 * Latin digits in both languages.
 * Standard in Iraqi technical writing — mixing Eastern Arabic numerals into
 * kWp / kWh figures makes them harder to scan, not easier.
 */
export const fmt = {
  int: (n: number) => Math.round(n).toLocaleString('en-US'),
  dec: (n: number, digits = 1) =>
    n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }),
};
