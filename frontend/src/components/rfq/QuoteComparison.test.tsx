import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuoteComparison } from './QuoteComparison';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import type { SubmittedRequest } from '../../state/QuoteRequestProvider';

vi.mock('../../api/useCompanies', () => ({
  useCompanies: () => ({ companies: [], source: 'api' }),
}));
const { confirmDepositPayment } = vi.hoisted(() => ({
  confirmDepositPayment: vi.fn(),
}));
vi.mock('../../state/QuoteRequestProvider', () => ({
  useQuoteRequest: () => ({ confirmDepositPayment }),
}));

afterEach(() => {
  cleanup();
  confirmDepositPayment.mockReset();
  window.history.replaceState(null, '', '/');
});

const request: SubmittedRequest = {
  id: 'request-1',
  localId: 'request-1',
  createdAt: '2026-05-01T00:00:00Z',
  status: 'quotes_received',
  draft: {
    systemKWp: 8,
    batteryKWh: 10,
    panelCount: 12,
    fromCalculator: false,
    systemType: 'hybrid',
    governorate: 'baghdad',
    district: 'Karrada',
    propertyType: 'house',
    roofType: 'flat',
    roofArea: '80',
    gridStatus: 'both',
    budget: '20m',
    timeline: 'month',
    financing: true,
    greenInitiative: false,
    greenInitiativeBudgetIqd: '',
    greenInitiativeRate: 0,
    notes: '',
    companyIds: ['2'],
    name: 'Customer',
    phone: '07700000000',
    whatsapp: true,
    email: '',
  },
  statuses: { '2': 'quoted' },
  quotes: {
    '2': {
      total_iqd: 1_000_000,
      panel_iqd: 400_000,
      inverter_iqd: 300_000,
      battery_iqd: 100_000,
      installation_iqd: 200_000,
      capacity_kwp: 8,
      panel_brand: 'Panel',
      inverter_brand: 'Inverter',
      battery_brand: 'Battery',
      warranty: '10 years',
      install_days: 5,
      financing: true,
      down_payment_iqd: 200_000,
      installment_months: 6,
      monthly_installment_iqd: 133_333,
      green_initiative_supported: false,
      valid_days: 14,
      notes: '',
      created_at: '2026-05-01T00:00:00Z',
    },
  },
  completedProjects: [],
};

describe('QuoteComparison direct financing', () => {
  it('shows total, upfront payment, and monthly payment with term', () => {
    render(
      <LanguageProvider>
        <QuoteComparison request={request} />
      </LanguageProvider>,
    );

    expect(screen.getAllByText('Total price').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Upfront down payment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Monthly payment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('200,000 IQD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('133,333 IQD × 6 Installments').length).toBeGreaterThan(0);
  });

  it('collects mock payment details and renders a downloadable receipt', async () => {
    confirmDepositPayment.mockResolvedValue({
      transaction_id: 'UTU-TEST-123',
      payment_method: 'fib',
      total_iqd: 1_000_000,
      deposit_iqd: 50_000,
      remaining_iqd: 950_000,
      commission_iqd: 50_000,
      payment_status: 'paid',
      commission_status: 'collected',
      project_status: 'in_progress',
      created_at: '2026-05-01T00:00:00Z',
      refunded_at: null,
    });
    render(
      <LanguageProvider>
        <QuoteComparison request={request} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Choose this company/ })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('50,000 IQD')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/First Iraqi Bank/));
    fireEvent.click(screen.getByRole('button', { name: /Confirm mock payment/ }));

    await waitFor(() => expect(confirmDepositPayment).toHaveBeenCalledWith(
      request.id,
      '2',
      'fib',
      request.draft.phone,
    ));
    expect(await screen.findByText('UTU-TEST-123')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download receipt' })).toHaveAttribute(
      'download',
      'utu-receipt-UTU-TEST-123.txt',
    );
  });

  it('opens an existing digital receipt from a payment notification link', async () => {
    const receipt = {
      transaction_id: 'UTU-RECEIPT-42',
      payment_method: 'zaincash' as const,
      total_iqd: 1_000_000,
      deposit_iqd: 50_000,
      remaining_iqd: 950_000,
      commission_iqd: 50_000,
      payment_status: 'paid' as const,
      commission_status: 'collected' as const,
      project_status: 'in_progress' as const,
      created_at: '2026-06-01T09:00:00Z',
      refunded_at: null,
    };
    window.history.replaceState(
      null,
      '',
      '/#/requests?requestId=request-1&companyId=2&payment=1',
    );
    render(
      <LanguageProvider>
        <QuoteComparison request={{ ...request, payments: { '2': receipt } }} />
      </LanguageProvider>,
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('UTU-RECEIPT-42')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download receipt' })).toHaveAttribute(
      'download',
      'utu-receipt-UTU-RECEIPT-42.txt',
    );
  });
});
