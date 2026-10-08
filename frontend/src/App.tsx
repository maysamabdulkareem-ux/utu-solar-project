import { lazy, Suspense } from 'react';
import { HomePage } from './pages/HomePage';
import { RequestQuotePage } from './pages/RequestQuotePage';
import { MyRequestsPage } from './pages/MyRequestsPage';
import { CompanyPortalPage } from './pages/CompanyPortalPage';
import { PublicCompanyPage } from './pages/PublicCompanyPage';
import { CompaniesDirectoryPage } from './pages/CompaniesDirectoryPage';
import { AuthModal } from './components/auth/AuthModal';
import { useHashRoute } from './routes/useHashRoute';
import { useLanguage } from './i18n/LanguageProvider';
import { ProtectedRoute } from './routes/ProtectedRoute';

const GreenInitiativeVerificationPage = lazy(() =>
  import('./pages/GreenInitiativeVerificationPage').then((module) => ({
    default: module.GreenInitiativeVerificationPage,
  })),
);
/**
 * Views picked off the hash.
 *
 * The skip link lives here rather than in each page so it is always the first
 * tab stop, whichever view is showing.
 */
export default function App() {
  const { t } = useLanguage();
  const { route, companyId, verificationId } = useHashRoute();

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
      {route === 'company' && (
        <ProtectedRoute allowedRoles={['company']}>
          <CompanyPortalPage />
        </ProtectedRoute>
      )}
      {route === 'admin' && (
        <ProtectedRoute allowedRoles={['admin']}>
          <CompanyPortalPage />
        </ProtectedRoute>
      )}
      {route === 'companyDetails' && companyId !== null && <PublicCompanyPage companyId={companyId} />}
      {route === 'companyDirectory' && <CompaniesDirectoryPage />}
      {route === 'greenVerification' && verificationId !== null && (
        <Suspense fallback={<main role="status" className="container-page py-10">{t('green.loading')}</main>}>
          <GreenInitiativeVerificationPage verificationId={verificationId} />
        </Suspense>
      )}
      {route === 'home' && <HomePage />}
      <AuthModal />
    </>
  );
}
