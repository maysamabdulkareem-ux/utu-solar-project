import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  type ApiCompany,
  type ApiProject,
  type AuthUser,
  type CompanyPortalRequest,
} from '../api/client';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { CompanyPortalPage } from './CompanyPortalPage';
import { AUTH_TOKEN_KEY, AuthProvider } from '../state/AuthContext';

vi.mock('../api/client', () => ({
  api: {
    authMe: vi.fn(),
    adminPendingCompanies: vi.fn(),
    adminRevenue: vi.fn(),
    refundDepositPayment: vi.fn(),
    adminPolicyReports: vi.fn(),
    adminVerificationDocument: vi.fn(),
    updatePolicyReportStatus: vi.fn(),
    reviewCompany: vi.fn(),
    listProjects: vi.fn(),
    updateProjectStatus: vi.fn(),
    companyProfile: vi.fn(),
    registerCompany: vi.fn(),
    updateCompanySupportPhone: vi.fn(),
    updateCompanyProfileContacts: vi.fn(),
    companyInbox: vi.fn(),
    chatMessages: vi.fn(),
    sendChatMessage: vi.fn(),
    submitCompanyQuote: vi.fn(),
    completeCompanyInstallation: vi.fn(),
    updateCompanyVerification: vi.fn(),
    uploadVerificationDocument: vi.fn(),
    logoutCompany: vi.fn(),
  },
}));

vi.mock('../api/useCompanies', () => ({ invalidateCompanies: vi.fn() }));

afterEach(cleanup);

const pendingCompany: ApiCompany = {
  id: 4,
  name: 'Sun Company',
  logo_url: null,
  founded_year: 2020,
  projects_count: 0,
  phone: '07700000000',
  email: 'sun@example.com',
  address: 'Baghdad',
  verification_status: 'pending',
  rating: 0,
  reviews_count: 0,
  business_license_number: 'LIC-123',
  tax_registration_number: undefined,
  has_license_document: true,
  has_tax_document: true,
  verification_documents: ['license', 'national_id'],
};

const verifiedCompany: ApiCompany = {
  ...pendingCompany,
  verification_status: 'verified',
};

const adminProject: ApiProject = {
  id: 8,
  title: 'Residential Solar System',
  description: 'A completed rooftop installation.',
  company_id: 4,
  company: {
    id: 4,
    name: 'Sun Company',
    logo_url: null,
    founded_year: 2020,
    projects_count: 1,
    address: 'Baghdad',
    verification_status: 'verified',
  },
  client_name: 'Test Customer',
  location_governorate: 'Baghdad',
  location_district: 'Al-Jadriya',
  system_kwp: 8.4,
  battery_kwh: 10,
  installation_type: 'hybrid',
  rating: 0,
  image_url: '',
  gallery_urls: [],
  status: 'in_progress',
  completed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  panel_count: 12,
  roof_type: 'flat',
  inverter_details: null,
  annual_generation_kwh: null,
  testimonial: null,
};

const companyUser: AuthUser = {
  id: 4,
  email: 'sun@example.com',
  phone: '07700000000',
  full_name: 'Sun Company',
  role: 'company',
  is_active: true,
  is_verified: true,
  company_id: 4,
  created_at: '2026-01-01T00:00:00Z',
};

const assignedRequest: CompanyPortalRequest = {
  group_id: 'UTU-2026-COMPANY-TEST',
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
  customer_name: 'Test Customer',
  customer_phone: '07711111111',
  system_kwp: 8.4,
  battery_kwh: 10,
  panel_count: 12,
  is_green_initiative: true,
  green_initiative_budget_iqd: 12_000_000,
  details: {
    governorate: 'Baghdad',
    district: 'Al-Jadriya',
    systemType: 'hybrid',
    budget: '20m IQD',
    notes: 'Include installation',
    financing: true,
  },
  companies: [{
    id: 1,
    company_id: 4,
    company_name: 'Sun Company',
    status: 'sent',
    green_verification_id: null,
    quote: null,
    completed_projects: [],
  }],
};

describe('CompanyPortalPage admin requirements', () => {
  it('loads admin applications with the signed-in administrator session and explains approval requirements', async () => {
    localStorage.clear();
    const admin: AuthUser = {
      id: 1,
      email: 'admin@example.com',
      phone: null,
      full_name: 'Platform Admin',
      role: 'admin',
      is_active: true,
      is_verified: true,
      company_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    localStorage.setItem(AUTH_TOKEN_KEY, 'admin-jwt');
    vi.mocked(api.authMe).mockResolvedValue(admin);
    vi.mocked(api.adminPendingCompanies).mockResolvedValue([pendingCompany]);
    vi.mocked(api.listProjects).mockResolvedValue([adminProject]);
    vi.mocked(api.updateProjectStatus).mockResolvedValue({
      ...adminProject,
      status: 'completed',
      completed_at: '2026-01-02T00:00:00Z',
    });
    vi.mocked(api.adminRevenue).mockResolvedValue([{
      assignment_id: 5,
      request_id: 2,
      project_id: 8,
      project_title: 'Residential Solar System',
      company_name: 'Sun Company',
      total_agreed_price_iqd: 10_000_000,
      commission_rate: 0.05,
      commission_fee_iqd: 500_000,
      status: 'completed',
      is_estimate: false,
      payment_status: 'paid',
      commission_status: 'collected',
      transaction_id: 'UTU-TEST-123',
      payment_method: 'fib',
      deposit_iqd: 500_000,
      remaining_iqd: 9_500_000,
    }, {
      assignment_id: 23,
      request_id: 13,
      project_id: 12,
      project_title: 'starlink111',
      company_name: 'Black Company',
      total_agreed_price_iqd: 20,
      commission_rate: 0.05,
      commission_fee_iqd: 1,
      status: 'completed',
      is_estimate: false,
    }, {
      assignment_id: 24,
      request_id: 14,
      project_id: 13,
      project_title: 'moon',
      company_name: 'Black Company',
      total_agreed_price_iqd: 20,
      commission_rate: 0.05,
      commission_fee_iqd: 1,
      status: 'completed',
      is_estimate: false,
    }, {
      assignment_id: 6,
      request_id: 4,
      project_id: 6,
      project_title: 'new project',
      company_name: 'Black Company',
      total_agreed_price_iqd: 19,
      commission_rate: 0.05,
      commission_fee_iqd: 1,
      status: 'completed',
      is_estimate: false,
    }, {
      assignment_id: null,
      request_id: null,
      project_id: 3,
      project_title: 'Commercial Solar Installation',
      company_name: 'Tigris Energy Works',
      total_agreed_price_iqd: 64_000_000,
      commission_rate: 0.05,
      commission_fee_iqd: 3_200_000,
      status: 'completed',
      is_estimate: true,
    }]);
    vi.mocked(api.adminPolicyReports).mockResolvedValue([{
      id: 3,
      subject: 'Inappropriate chat message',
      description: 'A user reported a message for review.',
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }]);
    vi.mocked(api.adminVerificationDocument).mockResolvedValue({
      company_id: 4,
      document_type: 'license',
      file_name: 'license.png',
      content_type: 'image/png',
      data_base64: 'iVBORw0KGgo=',
    });
    vi.mocked(api.updatePolicyReportStatus).mockResolvedValue({
      id: 3,
      subject: 'Inappropriate chat message',
      description: 'A user reported a message for review.',
      status: 'resolved',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    });
    vi.mocked(api.refundDepositPayment).mockResolvedValue({
      transaction_id: 'UTU-TEST-123',
      payment_method: 'fib',
      total_iqd: 10_000_000,
      deposit_iqd: 500_000,
      remaining_iqd: 9_500_000,
      commission_iqd: 500_000,
      payment_status: 'refunded',
      commission_status: 'reversed',
      project_status: 'cancelled',
      created_at: '2026-01-01T00:00:00Z',
      refunded_at: '2026-01-02T00:00:00Z',
    });
    render(
      <LanguageProvider>
        <AuthProvider>
          <CompanyPortalPage />
        </AuthProvider>
      </LanguageProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Platform administration' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Load applications' })).toBeInTheDocument();
    expect(screen.getByText(/no separate secret token is needed/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load applications' }));

    const approve = await screen.findByRole('button', { name: 'Approve Silver Badge' });
    expect(api.adminPendingCompanies).toHaveBeenCalledWith();
    expect(await screen.findByRole('heading', { name: 'Commission & Platform Revenue' })).toBeInTheDocument();
    const projectStatus = screen.getByRole('combobox', {
      name: 'Residential Solar System Project status',
    });
    expect(projectStatus).toHaveClass('platform-select');
    fireEvent.change(projectStatus, { target: { value: 'completed' } });
    await waitFor(() => expect(api.updateProjectStatus).toHaveBeenCalledWith(8, 'completed'));
    expect(screen.getByText('10,000,000 IQD')).toBeInTheDocument();
    expect(screen.getAllByText('500,000 IQD')).toHaveLength(2);
    expect(screen.getByText('UTU-TEST-123')).toBeInTheDocument();
    expect(screen.getByText('Commission settled (mock)')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Refund deposit' })[0]);
    await waitFor(() => expect(api.refundDepositPayment).toHaveBeenCalledWith(5));
    expect((await screen.findAllByText('Refunded')).length).toBeGreaterThan(0);
    expect(screen.getByText('starlink111')).toBeInTheDocument();
    expect(screen.getByText('moon')).toBeInTheDocument();
    expect(screen.getByText('new project')).toBeInTheDocument();
    expect(screen.getByText('(Estimated)')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Policy Reports & Chat Violations' })).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'View Document' })[0]);
    expect(await screen.findByRole('dialog', { name: 'license.png' })).toBeInTheDocument();
    expect(api.adminVerificationDocument).toHaveBeenCalledWith(4, 'license');
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
    expect(await screen.findByText('Resolved')).toBeInTheDocument();
    expect(api.updatePolicyReportStatus).toHaveBeenCalledWith(3, 'resolved');
    expect(approve).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Identity / office document reviewed'));
    expect(approve).toBeEnabled();
    fireEvent.click(approve);
    await waitFor(() => expect(api.reviewCompany).toHaveBeenCalledWith(4, expect.objectContaining({
      decision: 'identity_verified',
      identity_document_checked: true,
    })));
  });

  it('shows an empty state instead of sample reports when the database has no reports', async () => {
    localStorage.clear();
    const admin: AuthUser = {
      id: 1,
      email: 'admin@example.com',
      phone: null,
      full_name: 'Platform Admin',
      role: 'admin',
      is_active: true,
      is_verified: true,
      company_id: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    localStorage.setItem(AUTH_TOKEN_KEY, 'admin-jwt');
    vi.mocked(api.authMe).mockResolvedValue(admin);
    vi.mocked(api.adminPendingCompanies).mockResolvedValue([]);
    vi.mocked(api.listProjects).mockResolvedValue([]);
    vi.mocked(api.adminRevenue).mockResolvedValue([]);
    vi.mocked(api.adminPolicyReports).mockResolvedValue([]);
    render(
      <LanguageProvider>
        <AuthProvider>
          <CompanyPortalPage />
        </AuthProvider>
      </LanguageProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Load applications' }));
    expect(await screen.findByText('No policy reports or chat violations have been reported.')).toBeInTheDocument();
    expect(screen.queryByText('Attempted phone number sharing in chat')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument();
  });
});

describe('CompanyPortalPage quote marketplace', () => {
  afterEach(() => localStorage.clear());

  function renderCompanyPortal(profile = verifiedCompany, inbox = [assignedRequest]) {
    localStorage.setItem(AUTH_TOKEN_KEY, 'company-jwt');
    vi.mocked(api.authMe).mockResolvedValue(companyUser);
    vi.mocked(api.companyProfile).mockResolvedValue(profile);
    vi.mocked(api.companyInbox).mockResolvedValue(inbox);
    return render(
      <LanguageProvider>
        <AuthProvider>
          <CompanyPortalPage />
        </AuthProvider>
      </LanguageProvider>,
    );
  }

  it('keeps customer requests closed until the company is identity verified', async () => {
    vi.mocked(api.companyInbox).mockClear();
    vi.mocked(api.companyInbox).mockResolvedValue([assignedRequest]);
    renderCompanyPortal({ ...pendingCompany, verification_status: 'pending' });

    await waitFor(() => expect(api.companyProfile).toHaveBeenCalled());
    expect(api.companyInbox).not.toHaveBeenCalled();
    expect(screen.queryByText('UTU-2026-COMPANY-TEST')).not.toBeInTheDocument();
    expect(screen.queryByText(/07711111111/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send quote' })).not.toBeInTheDocument();
  });

  it('hides the customer phone until a deposit and locks an accepted quote', async () => {
    renderCompanyPortal(verifiedCompany, [{
      ...assignedRequest,
      customer_phone: null,
      status: 'accepted',
      companies: [{ ...assignedRequest.companies[0], status: 'selected' }],
    }]);

    expect(await screen.findByText('Phone shown after the customer pays the deposit')).toBeInTheDocument();
    expect(screen.queryByText(/07711111111/)).not.toBeInTheDocument();
    expect(screen.getByText('The customer accepted your quote, so the price and terms can no longer be changed.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send quote' })).not.toBeInTheDocument();
  });

  it('shows a deposit confirmation and transaction details in the company request inbox', async () => {
    const paidRequest: CompanyPortalRequest = {
      ...assignedRequest,
      status: 'in_progress',
      companies: [{
        ...assignedRequest.companies[0],
        status: 'selected',
        payment: {
          transaction_id: 'UTU-COMPANY-123',
          payment_method: 'zaincash',
          total_iqd: 2_000_000,
          deposit_iqd: 100_000,
          remaining_iqd: 1_900_000,
          commission_iqd: 100_000,
          payment_status: 'simulated',
          commission_status: 'simulated',
          project_status: 'in_progress',
          created_at: '2026-01-01T00:00:00Z',
          refunded_at: null,
        },
      }],
    };
    renderCompanyPortal(verifiedCompany, [paidRequest]);

    expect(await screen.findByRole('status')).toHaveTextContent('The deposit is confirmed. You may begin the project.');
    expect(screen.getByText(/UTU-COMPANY-123/)).toBeInTheDocument();
    expect(screen.getByText(/100,000 IQD/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send quote' })).not.toBeInTheDocument();
  });

  it('requires an Iraqi mobile and accepts a short support code in company registration', async () => {
    vi.mocked(api.registerCompany).mockResolvedValue({
      id: 9,
      name: 'Code Solar',
      verification_status: 'pending',
    });
    renderCompanyPortal();

    fireEvent.click(screen.getByRole('button', { name: 'New company? Register here' }));
    fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Code Solar' } });
    const primaryPhone = screen.getByLabelText('Iraqi Mobile Phone');
    expect(primaryPhone).toBeRequired();
    fireEvent.change(primaryPhone, { target: { value: '07712345678' } });
    const supportPhone = screen.getByLabelText('Company Support Hotline');
    expect(supportPhone).toBeRequired();
    expect(supportPhone).toHaveAttribute('placeholder', '07XXXXXXXXX or 6060');
    fireEvent.change(supportPhone, { target: { value: '6633' } });
    expect(supportPhone).toBeValid();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'code@example.com' } });
    fireEvent.change(screen.getByLabelText('Password (at least 10 characters)'), { target: { value: 'a-long-company-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit registration' }));

    await waitFor(() => expect(api.registerCompany).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Code Solar',
      phone: '07712345678',
      support_phone: '6633',
    })));
  });

  it('shows request specifications, filters the inbox, and submits a matching itemized quote', async () => {
    vi.mocked(api.chatMessages).mockResolvedValue([]);
    vi.mocked(api.submitCompanyQuote).mockResolvedValue({
      total_iqd: 1000,
      panel_iqd: 100,
      inverter_iqd: 200,
      battery_iqd: 300,
      installation_iqd: 400,
      capacity_kwp: 8.4,
      panel_brand: 'Panel Co',
      inverter_brand: 'Inverter Co',
      battery_brand: 'Battery Co',
      warranty: '10 years',
      install_days: 5,
      financing: false,
      down_payment_iqd: 200,
      installment_months: 3,
      monthly_installment_iqd: 267,
      valid_days: 14,
      notes: '',
    });
    renderCompanyPortal();

    expect(await screen.findByText('Include installation')).toBeInTheDocument();
    expect(screen.getByText(/Baghdad.*Al-Jadriya/)).toBeInTheDocument();
    expect(screen.getByText('Green Initiative / مبادرة خضراء')).toBeInTheDocument();
    expect(screen.getByText('12,000,000 IQD')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open conversation' }));
    await waitFor(() => expect(api.chatMessages).toHaveBeenCalledWith(
      assignedRequest.group_id,
      4,
      undefined,
      'company-jwt',
    ));

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Basra' } });
    expect(screen.getByRole('status')).toHaveTextContent('No requests match these filters.');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });

    fireEvent.change(screen.getByLabelText('Total price in IQD'), { target: { value: '999' } });
    fireEvent.change(screen.getByLabelText('Solar panels cost (IQD)'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Inverter cost (IQD)'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Battery cost (IQD)'), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText('Installation and commissioning cost (IQD)'), { target: { value: '400' } });
    fireEvent.change(screen.getByLabelText('Panel brand'), { target: { value: 'Panel Co' } });
    fireEvent.change(screen.getByLabelText('Inverter brand'), { target: { value: 'Inverter Co' } });
    fireEvent.change(screen.getByLabelText('Battery brand'), { target: { value: 'Battery Co' } });
    fireEvent.change(screen.getByLabelText('Warranty terms'), { target: { value: '10 years' } });
    fireEvent.change(screen.getByLabelText('Installation days'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Financing available' }));
    fireEvent.change(screen.getByLabelText('Down Payment (IQD)'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Repayment Period'), { target: { value: '3' } });
    expect(screen.getByLabelText('Monthly Installment (IQD)')).toHaveValue(266);
    fireEvent.change(screen.getByLabelText('Monthly Installment (IQD)'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use calculated installment' }));
    expect(screen.getByLabelText('Monthly Installment (IQD)')).toHaveValue(266);
    fireEvent.change(screen.getByLabelText('Monthly Installment (IQD)'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Supports Green Initiative documentation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send quote' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The total price must equal the sum of the itemized costs.');
    expect(api.submitCompanyQuote).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Total price in IQD'), { target: { value: '1000' } });
    expect(screen.getByLabelText('Monthly Installment (IQD)')).toHaveValue(267);
    fireEvent.change(screen.getByLabelText('Monthly Installment (IQD)'), { target: { value: '300' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send quote' }));
    await waitFor(() => expect(api.submitCompanyQuote).toHaveBeenCalledWith(
      'company-jwt',
      assignedRequest.group_id,
      4,
      expect.objectContaining({
        total_iqd: 1000,
        panel_iqd: 100,
        inverter_iqd: 200,
        battery_iqd: 300,
        installation_iqd: 400,
        financing: true,
        down_payment_iqd: 200,
        installment_months: 3,
        monthly_installment_iqd: 300,
        green_initiative_supported: true,
      }),
    ));
    expect(await screen.findByText('Quote saved and sent to the customer.')).toBeInTheDocument();
    expect(await screen.findByText('Quote sent. Wait for the customer to accept your offer before recording the installation as complete.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Project title')).not.toBeInTheDocument();
  });

  it('saves a support hotline without changing the company verification status', async () => {
    vi.mocked(api.updateCompanyProfileContacts).mockResolvedValue({
      phone: '07799999999',
      support_phone: '6060',
    });
    renderCompanyPortal({ ...verifiedCompany, phone: '07700000000', support_phone: '07711111111' });

    const primaryPhoneInput = await screen.findByLabelText('Primary Mobile');
    const supportPhoneInput = screen.getByLabelText('Support / Call Center Phone (Optional)');
    expect(primaryPhoneInput).toHaveValue('07700000000');
    expect(supportPhoneInput).toHaveValue('07711111111');
    fireEvent.change(primaryPhoneInput, { target: { value: '07799999999' } });
    fireEvent.change(supportPhoneInput, { target: { value: '6060' } });
    expect(supportPhoneInput).toBeValid();
    fireEvent.click(screen.getByRole('button', { name: 'Save contact numbers' }));

    await waitFor(() => expect(api.updateCompanyProfileContacts).toHaveBeenCalledWith(
      'company-jwt',
      { phone: '07799999999', support_phone: '6060' },
    ));
    expect(await screen.findByText('Company contact numbers saved.')).toBeInTheDocument();
    expect(screen.getByText('Tier 2 — Officially Verified Company · Gold Badge')).toBeInTheDocument();
    expect(screen.getByLabelText('Total price in IQD')).toBeInTheDocument();
  });

  it('shows a prominent inline validation message for short installation details', async () => {
    renderCompanyPortal();
    vi.mocked(api.companyInbox).mockResolvedValue([{
      ...assignedRequest,
      status: 'accepted',
      companies: [{
        ...assignedRequest.companies[0],
        status: 'selected',
        quote: {
          total_iqd: 1000,
          panel_iqd: 100,
          inverter_iqd: 200,
          battery_iqd: 300,
          installation_iqd: 400,
          capacity_kwp: 8.4,
          panel_brand: 'Panel Co',
          inverter_brand: 'Inverter Co',
          battery_brand: 'Battery Co',
          warranty: '10 years',
          install_days: 5,
          financing: false,
          valid_days: 14,
          notes: '',
        },
      }],
    }]);

    fireEvent.change(await screen.findByLabelText('Project title'), { target: { value: 'light' } });
    fireEvent.change(screen.getByLabelText('Installation type'), { target: { value: 'h' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mark installation completed' }));

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent(
      'Enter a project title and installation type with at least 2 characters each.',
    );
    expect(error).toHaveClass('px-4', 'py-3', 'text-body-sm');
    expect(api.completeCompanyInstallation).not.toHaveBeenCalled();
  });

  it('clears the previous verification notice and JWT when signing out', async () => {
    vi.mocked(api.updateCompanyVerification).mockResolvedValue({ verification_status: 'pending' });
    renderCompanyPortal(pendingCompany);

    await screen.findByRole('button', { name: 'Submit verification details' });
    fireEvent.change(screen.getByLabelText('Identity or office document Attach PDF or image (3 MB maximum)'), {
      target: { files: [new File(['%PDF-1.4'], 'identity.pdf', { type: 'application/pdf' })] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Submit verification details' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Verification details sent for admin review.');

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findAllByRole('button', { name: 'Sign in' })).toHaveLength(2);
    expect(screen.queryByText('Verification details sent for admin review.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Admin review' })).not.toBeInTheDocument();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(api.logoutCompany).not.toHaveBeenCalled();
  });

  it('uploads selected verification evidence with the company application', async () => {
    vi.mocked(api.updateCompanyVerification).mockResolvedValue({ verification_status: 'pending' });
    vi.mocked(api.uploadVerificationDocument).mockResolvedValue({
      company_id: 4,
      document_type: 'national_id',
      file_name: 'identity.pdf',
      content_type: 'application/pdf',
      data_base64: 'JVBERi0xLjQ=',
    });
    renderCompanyPortal(pendingCompany);

    const identityFile = new File(['%PDF-1.4'], 'identity.pdf', { type: 'application/pdf' });
    await screen.findByRole('button', { name: 'Submit verification details' });
    fireEvent.change(screen.getByLabelText('Identity or office document Attach PDF or image (3 MB maximum)'), {
      target: { files: [identityFile] },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Submit verification details' }));

    await waitFor(() => expect(api.uploadVerificationDocument).toHaveBeenCalledWith(
      'company-jwt',
      'national_id',
      identityFile,
    ));
    expect(await screen.findByText('Verification details sent for admin review.')).toBeInTheDocument();
  });
});