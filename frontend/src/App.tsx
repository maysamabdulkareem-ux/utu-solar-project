import { HomePage } from './pages/HomePage';
import { RequestQuotePage } from './pages/RequestQuotePage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { useHashRoute } from './routes/useHashRoute';
import { useLanguage } from './i18n/LanguageProvider';

/**
 * Three views, picked off the hash.
 *
 * The skip link lives here rather than in each page so it is always the first
 * tab stop, whichever view is showing.
 */
export default function App() {
  const { t } = useLanguage();
  const { route } = useHashRoute();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-bg-surface focus:px-4 focus:py-2.5 focus:text-label focus:text-content-primary focus:shadow-lg"
      >
        {t('a11y.skip')}
      </a>

      {route === 'request' && <RequestQuotePage />}
      {route === 'requests' && <MyRequestsPage />}
      {route === 'home' && <HomePage />}
    </>
  );
}
