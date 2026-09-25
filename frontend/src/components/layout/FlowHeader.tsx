import { Logo } from '../Logo';
import { Icon } from '../icons/Icon';
import { LanguageToggle } from '../ui/LanguageToggle';
import { useLanguage } from '../../i18n/LanguageProvider';
import { paths, type Route } from '../../routes/useHashRoute';

/**
 * Slim header for the request flow.
 *
 * The site nav is deliberately gone: once someone is filling a form, links to
 * eight other sections are an invitation to abandon it. One way out, clearly
 * marked, and the language switch — which matters more here than anywhere.
 */
export function FlowHeader({ exitTo = 'home' }: { exitTo?: Route }) {
  const { t } = useLanguage();

  return (
    <header className="on-dark sticky top-0 z-50 border-b border-line-on-dark bg-bg-inverse">
      <div className="container-page flex items-center gap-4 py-3.5">
        <a href={paths.home} className="shrink-0 rounded-md" aria-label={t('a11y.logoHome')}>
          <Logo onDark />
        </a>

        <div className="ms-auto flex items-center gap-2.5">
          <LanguageToggle />
          <a
            href={paths[exitTo]}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-label text-content-on-dark-muted transition-colors hover:text-content-on-dark"
          >
            <Icon name="x-mark" size={16} />
            <span className="hidden sm:inline">{t('rfq.exit')}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
