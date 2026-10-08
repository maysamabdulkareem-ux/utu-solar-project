import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n/LanguageProvider';
import { QuoteRequestProvider } from './state/QuoteRequestProvider';
import { AssessmentProvider } from './state/AssessmentProvider';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <QuoteRequestProvider>
        <AssessmentProvider>
          <App />
        </AssessmentProvider>
      </QuoteRequestProvider>
    </LanguageProvider>
  </StrictMode>,
);
