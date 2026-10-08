import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../state/AuthContext';
import { useLanguage } from '../i18n/LanguageProvider';
import type { AuthRole } from '../api/client';

type ProtectedRouteProps = {
  allowedRoles: readonly AuthRole[];
  children: ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isLoading, openAuthModal } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (isLoading || user) return;
    openAuthModal();
  }, [isLoading, openAuthModal, user]);

  if (isLoading) {
    return <main id="main" className="grid min-h-[60vh] place-items-center" aria-busy="true" />;
  }

  if (!user) {
    return null;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <main id="main" className="grid min-h-[60vh] place-items-center px-6">
        <section role="alert" className="max-w-lg rounded-xl border border-line-subtle bg-bg-surface p-8 text-center">
          <h1 className="text-h3 text-content-primary">403</h1>
          <p className="mt-3 text-body text-content-secondary">{t('auth.accessDenied')}</p>
          <a href="#/" className="mt-5 inline-flex rounded-md bg-bg-brand px-4 py-2 text-label text-white">
            {t('nav.home')}
          </a>
        </section>
      </main>
    );
  }

  return children;
}
