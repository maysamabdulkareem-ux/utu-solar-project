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
  it('shows all payment options and the mock-payment disclosure in English', () => {
    render(
      <LanguageProvider>
        <PaymentGateways />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', {
      name: 'Supporting Major Local & Regional Payment Gateways',
    })).toBeInTheDocument();
    expect(screen.getByText('ZainCash')).toBeInTheDocument();
    expect(screen.getByText('FIB')).toBeInTheDocument();
    expect(screen.getByText('Qi Card / Mastercard')).toBeInTheDocument();
    expect(screen.getByText('آسيا حوالة')).toBeInTheDocument();
    expect(screen.getByText('Visa Card · فيزا كارد')).toBeInTheDocument();
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
      name: 'يدعم أبرز بوابات الدفع العراقية والإقليمية',
    })).toBeInTheDocument();
    expect(screen.getByText('زين كاش')).toBeInTheDocument();
    expect(screen.getByText('المصرف العراقي الأول')).toBeInTheDocument();
    expect(screen.getByText(/لا يتم تنفيذ خصم مصرفي حقيقي/)).toBeInTheDocument();
  });
});
