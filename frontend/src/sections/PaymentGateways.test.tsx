import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { PaymentGateways } from './PaymentGateways';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('PaymentGateways', () => {
  it('shows only the demo deposit methods and the no-real-charge disclosure in English', () => {
    render(
      <LanguageProvider>
        <PaymentGateways />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', {
      name: 'Deposit methods in the demo',
    })).toBeInTheDocument();
    expect(screen.getByText('ZainCash')).toBeInTheDocument();
    expect(screen.getByText('FIB')).toBeInTheDocument();
    expect(screen.getByText('Qi Card')).toBeInTheDocument();
    // Only methods the backend accepts are listed.
    expect(screen.queryByText('آسيا حوالة')).not.toBeInTheDocument();
    expect(screen.queryByText(/Visa/)).not.toBeInTheDocument();
    expect(screen.getByText(/no real bank charge is made/i)).toBeInTheDocument();
  });

  it('localizes the banner and payment brands in Arabic', () => {
    localStorage.setItem('utu-lang', 'ar');
    render(
      <LanguageProvider>
        <PaymentGateways />
      </LanguageProvider>,
    );
    expect(screen.getByRole('heading', {
      name: 'طرق دفع العربون في النسخة التجريبية',
    })).toBeInTheDocument();
    expect(screen.getByText('زين كاش')).toBeInTheDocument();
    expect(screen.getByText('المصرف العراقي الأول')).toBeInTheDocument();
    expect(screen.getByText(/لا يتم تنفيذ خصم مصرفي حقيقي/)).toBeInTheDocument();
  });
});
