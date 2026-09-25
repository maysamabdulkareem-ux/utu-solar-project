import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { Logo } from '../Logo';
import { Icon } from '../icons/Icon';
import { Button } from '../ui/Button';
import { LanguageToggle } from '../ui/LanguageToggle';
import { navLinks } from '../../data/content';
import { useLanguage } from '../../i18n/LanguageProvider';
import { paths, useHashRoute } from '../../routes/useHashRoute';

/**
 * Sticky navigation.
 *
 * Desktop shows the full nav with the calculator flagged by a bolt chip.
 * Below `lg` it collapses to a disclosure menu: a real <button> with
 * aria-expanded/aria-controls, closed by Escape, and the trigger keeps a 44px
 * touch target. The language toggle stays visible at every width — it is the
 * first thing an Arabic-speaking visitor looks for.
 *
 * Sign-in has no account system behind it yet. Rather than leave a live button
 * that silently does nothing — the worst outcome for anyone on a keyboard or a
 * screen reader — it keeps its normal look and answers with a short notice, so
 * the promise it makes stays true.
 */
export function Header() {
  const { t } = useLanguage();
  const { go } = useHashRoute();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [soon, setSoon] = useState(false);
  const soonTimer = useRef<number | undefined>(undefined);

  const announceSoon = () => {
    setSoon(true);
    window.clearTimeout(soonTimer.current);
    soonTimer.current = window.setTimeout(() => setSoon(false), 4000);
  };

  useEffect(() => () => window.clearTimeout(soonTimer.current), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      setSoon(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header
      className={cn(
        'on-dark sticky top-0 z-50 border-b bg-bg-inverse transition-shadow',
        scrolled ? 'border-line-on-dark shadow-panel' : 'border-transparent',
      )}
    >
      <div className="container-page flex items-center gap-4 py-3.5 lg:gap-8 lg:py-4">
        <a href="#top" className="shrink-0 rounded-md" aria-label={t('a11y.logoHome')}>
          <Logo onDark />
        </a>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link, i) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={i === 0 ? 'page' : undefined}
                  className={cn(
                    'inline-block whitespace-nowrap rounded-md px-2.5 py-2 text-label transition-colors',
                    i === 0
                      ? 'bg-bg-panel-raised text-content-on-dark'
                      : 'text-content-on-dark-muted hover:text-content-on-dark',
                  )}
                >
                  {t(link.key)}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#calculator"
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-2 text-label text-content-on-dark-muted transition-colors hover:text-content-on-dark"
              >
                {t('nav.calc')}
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-[var(--brand-subtle)] text-content-brand">
                  <Icon name="zap" size={13} />
                </span>
              </a>
            </li>
            <li>
              <a
                href={paths.requests}
                className="inline-block whitespace-nowrap rounded-md px-2.5 py-2 text-label text-content-on-dark-muted transition-colors hover:text-content-on-dark"
              >
                {t('nav.requests')}
              </a>
            </li>
          </ul>
        </nav>

        <div className="relative ms-auto flex items-center gap-2 lg:gap-3">
          <LanguageToggle />

          <Button
            variant="onDark"
            size="md"
            className="hidden sm:inline-flex"
            onClick={announceSoon}
          >
            {t('cta.signin')}
          </Button>
          <Button
            size="md"
            className="hidden sm:inline-flex"
            onClick={() => go('request')}
          >
            {t('cta.start')}
          </Button>

          <a
            href="#calculator"
            aria-label={t('a11y.calcShortcut')}
            className="grid h-11 w-11 place-items-center rounded-md bg-[var(--brand-subtle)] text-content-brand lg:hidden"
          >
            <Icon name="zap" size={20} />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t('a11y.menuClose') : t('a11y.menuOpen')}
            className="grid h-11 w-11 place-items-center rounded-md bg-bg-panel-raised text-content-on-dark lg:hidden"
          >
            <Icon name={open ? 'x-mark' : 'menu'} size={22} />
          </button>

          {/*
            Anchored under the button group rather than inserted into the bar,
            so answering the click never pushes the page down. `role="status"`
            reaches a screen reader without stealing focus.
          */}
          {soon && (
            <p
              role="status"
              className="absolute end-0 top-full z-10 mt-2 max-w-[17rem] rounded-lg border border-line-on-dark bg-bg-panel-raised px-3.5 py-2.5 text-label-sm text-content-on-dark shadow-panel"
            >
              {t('cta.soon')}
            </p>
          )}
        </div>
      </div>

      {/* Mobile disclosure */}
      <nav
        id="mobile-nav"
        aria-label="Main"
        hidden={!open}
        className="border-t border-line-on-dark bg-bg-inverse lg:hidden"
      >
        <ul className="container-page flex flex-col py-2">
          {[
            ...navLinks,
            { key: 'nav.calc' as const, href: '#calculator' },
            { key: 'nav.requests' as const, href: paths.requests },
          ].map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-3 text-label text-content-on-dark-muted transition-colors hover:text-content-on-dark"
              >
                {t(link.key)}
              </a>
            </li>
          ))}
          <li className="mt-2 flex gap-3 border-t border-line-on-dark pb-2 pt-4 sm:hidden">
            <Button variant="onDark" size="md" fullWidth onClick={announceSoon}>
              {t('cta.signin')}
            </Button>
            <Button
              size="md"
              fullWidth
              onClick={() => {
                setOpen(false);
                go('request');
              }}
            >
              {t('cta.start')}
            </Button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
