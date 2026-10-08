import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n/LanguageProvider';
import { QuoteRequestProvider } from './state/QuoteRequestProvider';
import { AssessmentProvider } from './state/AssessmentProvider';
import { AuthProvider } from './state/AuthContext';
import { NotificationsProvider } from './state/NotificationsContext';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <NotificationsProvider>
          <QuoteRequestProvider>
            <AssessmentProvider>
              <App />
            </AssessmentProvider>
          </QuoteRequestProvider>
        </NotificationsProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
);
