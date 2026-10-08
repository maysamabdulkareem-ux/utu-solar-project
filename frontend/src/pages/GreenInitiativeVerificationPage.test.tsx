import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { LanguageProvider } from '../i18n/LanguageProvider';
import type { GreenInitiativeVerification } from '../api/client';
import { GreenInitiativeVerificationPage } from './GreenInitiativeVerificationPage';

vi.mock('../api/client', () => ({
  api: {
    greenInitiativeVerification: vi.fn(),
  },
}));

const record: GreenInitiativeVerification = {
  reference: 'UTU-2026-TEST',
  system_kwp: 8.4,
  battery_kwh: 10,
  panel_count: 12,
  governorate: 'Baghdad',
  district: 'Al-Jadriya',
  company_name: 'Verified Solar',
  company_verification_status: 'verified',
  business_license_number: 'LIC-123',
  tax_registration_number: 'TAX-123',
  license_checked: true,
  tax_record_checked: true,
  projects_checked: true,
  reviewed_at: '2026-10-05T12:00:00Z',
};

afterEach(cleanup);

beforeEach(() => {
  vi.mocked(api.greenInitiativeVerification).mockReset();
});

describe('Green Initiative verification page', () => {
  it('renders the public project/company record and QR without customer information', async () => {
    vi.mocked(api.greenInitiativeVerification).mockResolvedValue(record);
    const { container } = render(
      <LanguageProvider>
        <GreenInitiativeVerificationPage verificationId="opaque-verification-id" />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Verified Solar · Verified company')).toBeInTheDocument();
    expect(screen.getByText('8.4 kWp')).toBeInTheDocument();
    expect(screen.getByText(/LIC-123/)).toBeInTheDocument();
    expect(screen.getByText('UTU-2026-TEST')).toBeInTheDocument();
    expect(container.querySelector('svg[aria-label="Scan to open this verification page"]')).toBeInTheDocument();
    expect(screen.queryByText(/customer@example.com|07712345678/)).not.toBeInTheDocument();
  });

  it('prints the official certificate after verification data has loaded', async () => {
    vi.mocked(api.greenInitiativeVerification).mockResolvedValue(record);
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    render(
      <LanguageProvider>
        <GreenInitiativeVerificationPage verificationId="opaque-verification-id" />
      </LanguageProvider>,
    );

    expect(await screen.findByText('Verified Solar · Verified company')).toBeInTheDocument();
    expect(screen.getByText(
      'Official Green Initiative Verification Certificate / شهادة توثيق المبادرة الخضراء',
    )).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF / طباعة التقرير' }));

    expect(print).toHaveBeenCalledOnce();
  });

  it('shows an explicit unavailable state when verification lookup fails', async () => {
    vi.mocked(api.greenInitiativeVerification).mockRejectedValue(new Error('Not found'));
    render(
      <LanguageProvider>
        <GreenInitiativeVerificationPage verificationId="invalid" />
      </LanguageProvider>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This verification link is invalid or no longer available.',
    );
  });
});
