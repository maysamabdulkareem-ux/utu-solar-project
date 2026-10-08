import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { QuoteRequestProvider } from '../state/QuoteRequestProvider';
import { AuthProvider } from '../state/AuthContext';
import { MyRequestsPage } from './MyRequestsPage';
import { api, type AuthUser, type QuoteRequestGroup } from '../api/client';
import { AUTH_TOKEN_KEY } from '../state/AuthContext';

vi.mock('../api/client', () => ({
  api: {
    authMe: vi.fn(),
    myQuoteRequests: vi.fn(),
    updateQuoteRequest: vi.fn(),
    claimGuestQuoteRequests: vi.fn(),
    createReview: vi.fn(),
    myProjectReview: vi.fn(),
    updateReview: vi.fn(),
    listQuoteRequests: vi.fn().mockResolvedValue([]),
    chatMessages: vi.fn(),
    sendChatMessage: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, readonly status: number) {
      super(message);
    }
  },
}));
vi.mock('../api/useCompanies', () => ({
  useCompanies: () => ({ companies: [], source: 'api' }),
  invalidateCompanies: vi.fn(),
}));

vi.mock('../components/rfq/QuoteComparison', () => ({ QuoteComparison: () => null }));

afterEach(cleanup);

const groupId = 'UTU-2026-REVIEW-TEST';
const accessToken = 'private-customer-request-access-token-123';

function saveRequest(completedProjects: object[] = [], status = 'sent', greenInitiative = false) {
  localStorage.clear();
  localStorage.setItem('utu-quote-requests', JSON.stringify([{
    id: groupId,
    localId: groupId,
    createdAt: '2026-10-02T00:00:00Z',
    draft: {
      systemKWp: 8.4,
      batteryKWh: 10,
      panelCount: 12,
      fromCalculator: false,
      systemType: 'hybrid',
      governorate: 'baghdad',
      district: 'Al-Jadriya',
      propertyType: 'house',
      roofType: 'flat',
      roofArea: '80',
      gridStatus: 'both',
      budget: '20m',
      timeline: 'month',
      financing: false,
      greenInitiative,
      greenInitiativeBudgetIqd: '',
      greenInitiativeRate: 0,
      notes: '',
      companyIds: ['2'],
      name: 'Ahmed Customer',
      phone: '07700000000',
      whatsapp: true,
      email: '',
    },
    statuses: { '2': status },
    quotes: {},
    completedProjects: completedProjects.map((project) => ({
      status: 'completed',
      company_verification_status: 'verified',
      review_eligible: true,
      ...project,
    })),
    greenVerificationIds: greenInitiative && status === 'selected'
      ? { '2': 'public-green-verification-id' }
      : {},
  }]));
  localStorage.setItem('utu-request-access', JSON.stringify({ [groupId]: accessToken }));
}

function renderRequests() {
  return render(
    <LanguageProvider>
      <AuthProvider>
        <QuoteRequestProvider>
          <MyRequestsPage />
        </QuoteRequestProvider>
      </AuthProvider>
    </LanguageProvider>,
  );
}

describe('MyRequestsPage review eligibility', () => {
  beforeEach(() => {
    saveRequest();
    vi.mocked(api.listQuoteRequests).mockResolvedValue([]);
  });

  it('explains that a company quote must arrive before the installation can be reviewed', async () => {
    vi.mocked(api.chatMessages).mockResolvedValue([]);
    renderRequests();

    expect(await screen.findByText(
      'Add review appears after a selected company sends a quote, completes the installation and records the finished project here.',
    )).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Verified Review' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open conversation' }));
    expect(await screen.findByText('Start the conversation with a safe in-platform message.')).toBeInTheDocument();
    expect(api.chatMessages).toHaveBeenCalledWith(
      groupId,
      2,
      accessToken,
      undefined,
    );
  });

  it('tags green requests and links an accepted offer to its public verification page', async () => {
    saveRequest([], 'selected', true);
    renderRequests();

    expect(await screen.findByText('Green Initiative / مبادرة خضراء')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open public verification' })).toHaveAttribute(
      'href',
      '#/verify/public-green-verification-id',
    );
  });

  it('shows the accepted direct-installment payment schedule', async () => {
    saveRequest([], 'selected');
    const saved = JSON.parse(localStorage.getItem('utu-quote-requests') ?? '[]');
    saved[0].quotes['2'] = {
      total_iqd: 1_000_000,
      panel_iqd: 400_000,
      inverter_iqd: 300_000,
      battery_iqd: 100_000,
      installation_iqd: 200_000,
      capacity_kwp: 8.4,
      panel_brand: 'Panel',
      inverter_brand: 'Inverter',
      battery_brand: 'Battery',
      warranty: '10 years',
      install_days: 5,
      financing: true,
      down_payment_iqd: 200_000,
      installment_months: 6,
      monthly_installment_iqd: 133_333,
      valid_days: 14,
      notes: '',
    };
    localStorage.setItem('utu-quote-requests', JSON.stringify(saved));
    renderRequests();

    expect(await screen.findByRole('heading', { name: 'Payment Schedule / جدول التسديد' })).toBeInTheDocument();
    expect(screen.getByText('200,000 IQD')).toBeInTheDocument();
    expect(screen.getByText('133,333 IQD × 6 Installments')).toBeInTheDocument();
  });

  it('shows a helpful empty state when the customer has no completed projects', async () => {
    renderRequests();

    fireEvent.click(await screen.findByRole('tab', { name: 'Completed Projects' }));

    expect(screen.getByRole('heading', { name: 'No completed projects yet' })).toBeInTheDocument();
    expect(screen.getByText(/Completed installations recorded for your requests/)).toBeInTheDocument();
  });

  it('shows an inline review form for a server-linked completed project', async () => {
    saveRequest([{
      id: 9,
      title: 'Completed Baghdad installation',
      company_id: 2,
      company_name: 'Tigris Energy Works',
      system_kwp: 8.4,
      battery_kwh: 10,
      location_governorate: 'Baghdad',
      location_district: 'Al-Jadriya',
      completed_at: '2026-10-02T00:00:00Z',
      reviewed: false,
      status: 'completed' as const,
      company_verification_status: 'verified',
      review_eligible: true,
    }], 'selected');
    const saved = JSON.parse(localStorage.getItem('utu-quote-requests') ?? '[]');
    saved[0].quotes['2'] = {
      total_iqd: 12_000_000,
      panel_iqd: 4_000_000,
      inverter_iqd: 3_000_000,
      battery_iqd: 2_000_000,
      installation_iqd: 3_000_000,
      capacity_kwp: 8.4,
      panel_brand: 'Panel',
      inverter_brand: 'Inverter',
      battery_brand: 'Battery',
      warranty: '10-year panel warranty; 2-year installation warranty',
      install_days: 5,
      financing: false,
      valid_days: 14,
      notes: '',
    };
    localStorage.setItem('utu-quote-requests', JSON.stringify(saved));
    renderRequests();

    expect(await screen.findByRole('tab', { name: 'Completed Projects' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Completed Projects' }));
    expect(await screen.findByText('Completed Baghdad installation')).toBeInTheDocument();
    expect(screen.getByText('10-year panel warranty; 2-year installation warranty')).toBeInTheDocument();
    expect(screen.getByText(/8.4 kWp · 12 panels/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Active Requests & Projects' }));
    expect(screen.queryByText('Completed Baghdad installation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Completed Projects' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add Verified Review' }));
    expect(screen.getByRole('dialog', { name: 'Review your installation' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Your feedback')).toBeInTheDocument();
    expect(screen.getByLabelText('Your feedback')).toBeInTheDocument();
    expect(screen.queryByText(/Add review appears after/)).not.toBeInTheDocument();
  });

  it('lets the authenticated request owner submit a review without a browser request token', async () => {
    const user: AuthUser = {
      id: 17,
      email: 'client@example.com',
      phone: '07700000000',
      full_name: 'Ahmed Customer',
      role: 'client',
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-10-05T00:00:00Z',
    };
    const project = {
      id: 91,
      title: 'Owned completed project',
      company_id: 2,
      company_name: 'Tigris Energy Works',
      system_kwp: 8.4,
      battery_kwh: 10,
      location_governorate: 'Baghdad',
      location_district: 'Al-Jadriya',
      completed_at: '2026-10-02T00:00:00Z',
      reviewed: false,
      status: 'completed' as const,
      company_verification_status: 'verified',
      review_eligible: true,
    };
    const group: QuoteRequestGroup = {
      group_id: groupId,
      status: 'completed',
      created_at: '2026-10-02T00:00:00Z',
      customer_name: 'Ahmed Customer',
      customer_phone: '07700000000',
      system_kwp: 8.4,
      battery_kwh: 10,
      panel_count: 12,
      details: { governorate: 'baghdad', district: 'Al-Jadriya' },
      companies: [{
        id: 2,
        company_id: 2,
        company_name: 'Tigris Energy Works',
        status: 'selected',
        quote: null,
        completed_projects: [project],
      }],
    };
    const review = {
      id: 1,
      company_id: 2,
      company_name: 'Tigris Energy Works',
      project_id: project.id,
      project_title: project.title,
      system_kwp: 8.4,
      location_governorate: 'Baghdad',
      location_district: 'Al-Jadriya',
      client_name: 'Ahmed M.',
      rating: 5,
      communication_rating: 5,
      work_quality_rating: 5,
      comment: 'The installer completed the system carefully and on time.',
      is_verified: true,
      created_at: '2026-10-02T00:00:00Z',
    };

    saveRequest();
    localStorage.removeItem('utu-request-access');
    localStorage.setItem(AUTH_TOKEN_KEY, 'owner-client-jwt');
    vi.mocked(api.authMe).mockResolvedValue(user);
    vi.mocked(api.myQuoteRequests).mockResolvedValue([group]);
    vi.mocked(api.claimGuestQuoteRequests).mockResolvedValue({ claimed: 0 });
    vi.mocked(api.createReview).mockResolvedValue(review);
    renderRequests();

    fireEvent.click(await screen.findByRole('tab', { name: 'Completed Projects' }));
    expect(await screen.findByText(project.title)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Verified Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Overall rating: 4 out of 5' }));
    fireEvent.change(screen.getByLabelText('Your feedback'), {
      target: { value: 'The installer completed the system carefully and on time.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    await waitFor(() => expect(api.createReview).toHaveBeenCalledWith({
      project_id: project.id,
      rating: 4,
      communication_rating: 5,
      work_quality_rating: 5,
      comment: 'The installer completed the system carefully and on time.',
    }, 'owner-client-jwt'));
    expect(await screen.findByText('Thank you. Your verified review has been published.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 5 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('The installer completed the system carefully and on time.')).toBeInTheDocument();
    expect(screen.getByText('Verified Purchase')).toBeInTheDocument();
  });

  it('loads and updates an existing review for the authenticated request owner', async () => {
    const user: AuthUser = {
      id: 18,
      email: 'review-edit@example.com',
      phone: null,
      full_name: 'Review Editor',
      role: 'client',
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-10-05T00:00:00Z',
    };
    const project = {
      id: 92,
      title: 'Previously reviewed project',
      company_id: 2,
      company_name: 'Tigris Energy Works',
      system_kwp: 8.4,
      battery_kwh: 10,
      location_governorate: 'Baghdad',
      location_district: 'Al-Jadriya',
      completed_at: '2026-10-02T00:00:00Z',
      reviewed: true,
      status: 'completed' as const,
      company_verification_status: 'verified',
      review_eligible: true,
    };
    const group: QuoteRequestGroup = {
      group_id: groupId,
      status: 'completed',
      created_at: '2026-10-02T00:00:00Z',
      customer_name: 'Review Editor',
      customer_phone: '07700000000',
      system_kwp: 8.4,
      battery_kwh: 10,
      panel_count: 12,
      details: { governorate: 'baghdad', district: 'Al-Jadriya' },
      companies: [{
        id: 2,
        company_id: 2,
        company_name: 'Tigris Energy Works',
        status: 'selected',
        quote: null,
        completed_projects: [project],
      }],
    };
    const existingReview = {
      id: 2,
      company_id: 2,
      company_name: project.company_name,
      project_id: project.id,
      project_title: project.title,
      system_kwp: 8.4,
      location_governorate: 'Baghdad',
      location_district: 'Al-Jadriya',
      client_name: 'Review E.',
      rating: 5,
      communication_rating: 4,
      work_quality_rating: 5,
      comment: 'The original review describes a good installation.',
      is_verified: true,
      created_at: '2026-10-02T00:00:00Z',
    };

    saveRequest();
    localStorage.setItem(AUTH_TOKEN_KEY, 'review-editor-jwt');
    vi.mocked(api.authMe).mockResolvedValue(user);
    vi.mocked(api.myQuoteRequests).mockResolvedValue([group]);
    vi.mocked(api.claimGuestQuoteRequests).mockResolvedValue({ claimed: 0 });
    vi.mocked(api.myProjectReview).mockResolvedValue(existingReview);
    vi.mocked(api.updateReview).mockResolvedValue({
      ...existingReview,
      rating: 3,
      comment: 'Updated review with useful installation details.',
    });
    renderRequests();

    fireEvent.click(await screen.findByRole('tab', { name: 'Completed Projects' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit review' }));
    const feedback = await screen.findByLabelText('Your feedback');
    await waitFor(() => expect(feedback).toHaveValue(existingReview.comment));
    fireEvent.change(feedback, { target: { value: 'Updated review with useful installation details.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Overall rating: 3 out of 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(api.updateReview).toHaveBeenCalledWith({
      project_id: project.id,
      rating: 3,
      communication_rating: 4,
      work_quality_rating: 5,
      comment: 'Updated review with useful installation details.',
    }, 'review-editor-jwt'));
    expect(await screen.findByText('Your review has been updated.')).toBeInTheDocument();
  });

  it('prompts unauthenticated clients to sign in when their private request token is missing', async () => {
    saveRequest([{
      id: 94,
      title: 'Tokenless completed project',
      company_id: 2,
      company_name: 'Tigris Energy Works',
      system_kwp: 8.4,
      battery_kwh: 10,
      location_governorate: 'Baghdad',
      location_district: 'Al-Jadriya',
      completed_at: '2026-10-02T00:00:00Z',
      reviewed: false,
    }], 'selected');
    localStorage.removeItem('utu-request-access');
    localStorage.setItem('utu-request-access', JSON.stringify({ 'OTHER-REQUEST': accessToken }));
    renderRequests();

    fireEvent.click(await screen.findByRole('tab', { name: 'Completed Projects' }));
    expect(await screen.findByText(
      'Sign in with the client account that owns this request to review the installation.',
    )).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in to review' })).toBeInTheDocument();
    expect(screen.queryByText(/This browser no longer has the private request link/)).not.toBeInTheDocument();
  });

  it('does not offer a review for a completed project unless the customer selected that company', async () => {
    saveRequest([{
      id: 10,
      title: 'Unaccepted company installation',
      company_id: 2,
      company_name: 'Tigris Energy Works',
      system_kwp: 8.4,
      battery_kwh: 10,
      location_governorate: 'Baghdad',
      location_district: 'Al-Jadriya',
      completed_at: '2026-10-02T00:00:00Z',
      reviewed: false,
    }], 'quoted');
    renderRequests();

    expect(screen.queryByRole('button', { name: 'Add Verified Review' })).not.toBeInTheDocument();
    expect(await screen.findByText('This company was not selected for your project. Accept its quote before a review can be submitted.')).toBeInTheDocument();
  });

  it('does not offer a review while installation is in progress or the company is not verified', async () => {
    saveRequest([{
      id: 11,
      title: 'Ongoing unverified installation',
      company_id: 2,
      company_name: 'Tigris Energy Works',
      system_kwp: 8.4,
      battery_kwh: 10,
      location_governorate: 'Baghdad',
      location_district: 'Al-Jadriya',
      completed_at: null,
      reviewed: false,
      status: 'in_progress',
      company_verification_status: 'identity_verified',
      review_eligible: false,
    }], 'selected');
    renderRequests();

    fireEvent.click(await screen.findByRole('tab', { name: 'Completed Projects' }));
    expect(await screen.findByText('Ongoing unverified installation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Verified Review' })).not.toBeInTheDocument();
    expect(screen.getByText('Reviews are available only for completed projects by officially verified companies.')).toBeInTheDocument();
  });

  it('links locally-held guest request tokens after client sign-in and displays server quotes', async () => {
    const user: AuthUser = {
      id: 17,
      email: 'client@example.com',
      phone: '07700000000',
      full_name: 'Ahmed Customer',
      role: 'client',
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-10-05T00:00:00Z',
    };
    const group: QuoteRequestGroup = {
      group_id: groupId,
      status: 'quotes_received',
      created_at: '2026-10-02T00:00:00Z',
      customer_name: 'Ahmed Customer',
      customer_phone: '07700000000',
      system_kwp: 8.4,
      battery_kwh: 10,
      panel_count: 12,
      details: { governorate: 'baghdad', district: 'Al-Jadriya' },
      companies: [{
        id: 2,
        company_id: 2,
        company_name: 'Tigris Energy Works',
        status: 'quoted',
        quote: {
          total_iqd: 12_000_000,
          panel_iqd: 4_000_000,
          inverter_iqd: 3_000_000,
          battery_iqd: 2_000_000,
          installation_iqd: 3_000_000,
          capacity_kwp: 8.4,
          panel_brand: 'Test Panel',
          inverter_brand: 'Test Inverter',
          battery_brand: 'Test Battery',
          warranty: '10 years',
          install_days: 5,
          financing: false,
          valid_days: 14,
          notes: '',
          created_at: '2026-10-03T00:00:00Z',
        },
        completed_projects: [],
      }],
    };

    saveRequest();
    localStorage.setItem(AUTH_TOKEN_KEY, 'client-jwt');
    vi.mocked(api.authMe).mockResolvedValue(user);
    vi.mocked(api.claimGuestQuoteRequests).mockResolvedValue({ claimed: 1 });
    vi.mocked(api.myQuoteRequests).mockResolvedValue([group]);
    renderRequests();

    expect(await screen.findByText(groupId)).toBeInTheDocument();
    expect(await screen.findByText('1 of 1 quotes received')).toBeInTheDocument();
    expect(api.claimGuestQuoteRequests).toHaveBeenCalledWith([accessToken]);
    expect(api.myQuoteRequests).toHaveBeenCalled();
  });

  it('never displays another cached request to an authenticated client when the server returns no owned requests', async () => {
    const user: AuthUser = {
      id: 42,
      email: 'different-client@example.com',
      phone: null,
      full_name: 'Different Client',
      role: 'client',
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-10-05T00:00:00Z',
    };
    saveRequest();
    localStorage.setItem(AUTH_TOKEN_KEY, 'different-client-jwt');
    vi.mocked(api.authMe).mockResolvedValue(user);
    vi.mocked(api.myQuoteRequests).mockResolvedValue([]);
    vi.mocked(api.claimGuestQuoteRequests).mockResolvedValue({ claimed: 0 });
    renderRequests();

    expect(await screen.findByText('No requests yet')).toBeInTheDocument();
    expect(screen.queryByText(groupId)).not.toBeInTheDocument();
    expect(api.myQuoteRequests).toHaveBeenCalled();
  });

  it('fails closed instead of showing cached requests when the authenticated request lookup fails', async () => {
    const user: AuthUser = {
      id: 43,
      email: 'offline-client@example.com',
      phone: null,
      full_name: 'Offline Client',
      role: 'client',
      is_active: true,
      is_verified: false,
      company_id: null,
      created_at: '2026-10-05T00:00:00Z',
    };
    saveRequest();
    localStorage.setItem(AUTH_TOKEN_KEY, 'offline-client-jwt');
    vi.mocked(api.authMe).mockResolvedValue(user);
    vi.mocked(api.myQuoteRequests).mockRejectedValue(new Error('API unavailable'));
    vi.mocked(api.claimGuestQuoteRequests).mockResolvedValue({ claimed: 0 });
    renderRequests();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not verify your requests. For privacy, no locally cached requests are shown. Please try again.',
    );
    expect(screen.queryByText(groupId)).not.toBeInTheDocument();
  });

  it('submits request edits using the private request token and renders the updated server data', async () => {
    const updatedGroup: QuoteRequestGroup = {
      group_id: groupId,
      status: 'quotes_received',
      created_at: '2026-10-02T00:00:00Z',
      customer_name: 'Ahmed Customer',
      customer_phone: '07722223333',
      system_kwp: 9.6,
      battery_kwh: 12,
      panel_count: 14,
      details: {
        governorate: 'basra',
        district: 'Ashar',
        notes: 'Updated project details',
      },
      companies: [],
    };
    vi.mocked(api.updateQuoteRequest).mockResolvedValue(updatedGroup);
    vi.mocked(api.listQuoteRequests).mockResolvedValue([]);
    saveRequest();
    renderRequests();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit request' }));
    fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '07722223333' } });
    fireEvent.change(screen.getByLabelText('System capacity (kWp)'), { target: { value: '9.6' } });
    fireEvent.change(screen.getByLabelText('Battery capacity (kWh)'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Panel count'), { target: { value: '14' } });
    fireEvent.change(screen.getByLabelText('District'), { target: { value: 'Ashar' } });
    fireEvent.change(screen.getByLabelText('Additional notes'), { target: { value: 'Updated project details' } });
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'basra' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(api.updateQuoteRequest).toHaveBeenCalledWith(
      groupId,
      {
        customer_phone: '07722223333',
        system_kwp: 9.6,
        battery_kwh: 12,
        panel_count: 14,
        details: {
          governorate: 'basra',
          district: 'Ashar',
          notes: 'Updated project details',
        },
      },
      accessToken,
    ));
    expect(await screen.findByText('9.6 kWp · 14 panels')).toBeInTheDocument();
    expect(screen.getByText('Basra · Ashar')).toBeInTheDocument();
  });
});