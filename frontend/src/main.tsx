import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './i18n/LanguageProvider';
import { QuoteRequestProvider } from './state/QuoteRequestProvider';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <QuoteRequestProvider>
        <App />
      </QuoteRequestProvider>
    </LanguageProvider>
  </StrictMode>,
);
