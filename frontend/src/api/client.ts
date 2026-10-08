import type { Company, Project, VerifiedProjectReview } from '../data/content';
import type { Localized } from '../i18n/LanguageProvider';
import { AUTH_TOKEN_KEY } from '../state/AuthContext';

/**
 * The one place that talks to the backend.
 *
 * Every screen keeps working when the API is down: each call either returns
 * data or throws, and callers fall back to the bundled sample content. A
 * prototype gets demonstrated on machines where the Python server is not
 * running, and a blank page is a worse answer than slightly stale copy.
 */
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000';

/** Give up rather than leave a spinner running forever. */
const TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function storedAuthToken(): string {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const token = storedAuthToken();

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });

    if (!res.ok) {
      // FastAPI puts the reason in `detail`; surface it so a failed submit can
      // say what was wrong instead of "something went wrong".
      let detail = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === 'string') detail = body.detail;
        else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
          detail = String(body.detail[0].msg);
        }
      } catch {
        /* a non-JSON error body is not worth a second failure */
      }
      throw new ApiError(detail, res.status);
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The request timed out', 0);
    }
    if (error instanceof TypeError) {
      throw new ApiError('Could not reach the API. Check the backend URL, server, and CORS origin.', 0);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Companies                                                           */

/** A company exactly as the API returns it. */
export type ApiCompany = {
  id: number;
  name: string;
  logo_url: string | null;
  founded_year: number;
  projects_count: number;
  phone?: string | null;
  contact_phone?: string | null;
  phone_number?: string | null;
  support_phone?: string | null;
  email?: string | null;
  address: string | null;
  verification_status: string;
  verification_documents?: VerificationDocumentType[];
  completed_project_count?: number;
  rating: number;
  reviews_count: number;
  business_license_number?: string;
  tax_registration_number?: string;
  projects_checked?: boolean;
  license_checked?: boolean;
  tax_record_checked?: boolean;
  has_license_document?: boolean;
  has_tax_document?: boolean;
  verification?: CompanyVerificationApplication | null;
};

export type CompanyVerificationApplication = {
  company_id: number;
  business_license_number: string;
  tax_registration_number: string;
  license_checked: boolean;
  tax_record_checked: boolean;
  projects_checked: boolean;
  reviewed_at: string | null;
};

export type AdminRevenueEntry = {
  assignment_id: number | null;
  request_id: number | null;
  project_id: number;
  project_title: string;
  company_name: string;
  total_agreed_price_iqd: number;
  commission_rate: number;
  commission_fee_iqd: number;
  status: 'accepted' | 'completed';
  is_estimate: boolean;
  payment_status?: 'paid' | 'refunded' | null;
  commission_status?: 'collected' | 'reversed' | null;
  transaction_id?: string | null;
  payment_method?: 'zaincash' | 'fib' | 'qi_card' | null;
  deposit_iqd?: number | null;
  remaining_iqd?: number | null;
};

export type DepositPayment = {
  transaction_id: string;
  payment_method: 'zaincash' | 'fib' | 'qi_card';
  total_iqd: number;
  deposit_iqd: number;
  remaining_iqd: number;
  commission_iqd: number;
  payment_status: 'paid' | 'refunded';
  commission_status: 'collected' | 'reversed';
  project_status: 'in_progress' | 'cancelled';
  created_at: string;
  refunded_at: string | null;
};

export type PolicyReportStatus = 'pending' | 'resolved' | 'dismissed';

export type PolicyReport = {
  id: number;
  subject: string;
  description: string;
  status: PolicyReportStatus;
  created_at: string;
  updated_at: string;
};

export type VerificationDocument = {
  company_id: number;
  document_type: VerificationDocumentType;
  file_name: string;
  content_type: string;
  data_base64: string;
};

export type VerificationDocumentType =
  | 'national_id'
  | 'syndicate_card'
  | 'chamber_id'
  | 'office_permit'
  | 'business_register'
  | 'project_proof'
  | 'license'
  | 'tax';

export type CompanyProject = {
  id: number;
  title: string;
  description: string;
  system_kwp: number | null;
  location: string;
  completed_at: string | null;
};

export type ProjectStatus = 'in_progress' | 'completed' | 'featured';

export type ApiProject = {
  id: number;
  title: string;
  description: string;
  company_id: number;
  company: {
    id: number;
    name: string;
    logo_url: string | null;
    founded_year: number;
    projects_count: number;
    address: string | null;
    verification_status: string;
  };
  client_name: string | null;
  location_governorate: string;
  location_district: string;
  system_kwp: number;
  battery_kwh: number | null;
  installation_type: string;
  rating: number;
  image_url: string;
  gallery_urls: string[];
  status: ProjectStatus;
  completed_at: string | null;
  created_at: string;
  panel_count: number | null;
  roof_type: string | null;
  inverter_details: string | null;
  annual_generation_kwh: number | null;
  testimonial: string | null;
  verified_review?: VerifiedProjectReview | null;
};

export type ProjectCreateBody = {
  title: string;
  description?: string;
  company_id: number;
  client_name?: string | null;
  location_governorate: string;
  location_district: string;
  system_kwp: number;
  battery_kwh?: number | null;
  installation_type: string;
  rating?: number;
  image_url: string;
  gallery_urls?: string[];
  status?: ProjectStatus;
  completed_at?: string | null;
  panel_count?: number | null;
  roof_type?: string | null;
  inverter_details?: string | null;
  annual_generation_kwh?: number | null;
  testimonial?: string | null;
};

export type ApiReview = {
  id: number;
  company_id: number;
  company_name: string;
  project_id: number;
  project_title: string;
  system_kwp: number;
  location_governorate: string;
  location_district: string;
  client_name: string;
  rating: number;
  communication_rating: number;
  work_quality_rating: number;
  comment: string;
  is_verified: boolean;
  created_at: string;
};

export type ReviewCreateBody = {
  project_id: number;
  access_token?: string;
  rating: number;
  communication_rating: number;
  work_quality_rating: number;
  comment: string;
};

export type CompletedInstallationBody = {
  title: string;
  description?: string;
  installation_type: string;
  image_url?: string;
  gallery_urls?: string[];
};

const projectLocalizations: Record<string, { title: string; location: string; company: string; installation: string }> = {
  'Residential Solar System': {
    title: 'منظومة شمسية سكنية', location: 'بغداد · الجادرية', company: 'الرافدين للأنظمة الشمسية', installation: 'على الشبكة — سطح',
  },
  'Commercial Solar Installation': {
    title: 'تركيب شمسي تجاري', location: 'أربيل · المنطقة الصناعية', company: 'دجلة لأعمال الطاقة', installation: 'مصفوفة سطح مستوٍ',
  },
  'Hybrid Solar System': {
    title: 'منظومة شمسية هجينة', location: 'البصرة · الزبير', company: 'النهرين للطاقة المتجددة', installation: 'هجين',
  },
};

const projectCompanyArabic: Record<string, string> = {
  'Rafidain Solar Systems': 'الرافدين للأنظمة الشمسية',
  'Tigris Energy Works': 'دجلة لأعمال الطاقة',
  'Al-Nahrain Renewables': 'النهرين للطاقة المتجددة',
};

export function toProject(apiProject: ApiProject): Project {
  const localized = projectLocalizations[apiProject.title];
  const arabicLocation = localized?.location ?? `${apiProject.location_governorate} · ${apiProject.location_district}`;
  const installationAr = apiProject.battery_kwh && apiProject.battery_kwh > 0
    ? `${localized?.installation ?? 'هجين'} + ${apiProject.battery_kwh} kWh تخزين`
    : localized?.installation ?? apiProject.installation_type;

  return {
    id: String(apiProject.id),
    size: `${apiProject.system_kwp} kWp`,
    rating: apiProject.rating,
    tone: apiProject.battery_kwh && apiProject.battery_kwh > 0
      ? 'hybrid'
      : apiProject.system_kwp >= 20 ? 'commercial' : 'home',
    installationIcon: apiProject.battery_kwh && apiProject.battery_kwh > 0
      ? 'battery'
      : apiProject.system_kwp >= 20 ? 'building' : 'home',
    status: apiProject.status === 'in_progress' ? 'inProgress' : 'completed',
    imageUrl: apiProject.image_url,
    title: { en: apiProject.title, ar: localized?.title ?? apiProject.title },
    location: {
      en: `${apiProject.location_governorate} · ${apiProject.location_district}`,
      ar: arabicLocation,
    },
    installation: { en: apiProject.installation_type, ar: installationAr },
    company: {
      en: apiProject.company.name,
      ar: projectCompanyArabic[apiProject.company.name] ?? apiProject.company.name,
    },
    description: { en: apiProject.description, ar: apiProject.description },
    batteryKwh: apiProject.battery_kwh,
    completedAt: apiProject.completed_at,
    panelCount: apiProject.panel_count,
    roofType: apiProject.roof_type,
    inverterDetails: apiProject.inverter_details,
    annualGenerationKwh: apiProject.annual_generation_kwh,
    galleryUrls: apiProject.gallery_urls,
    testimonial: apiProject.testimonial,
    clientName: apiProject.client_name,
    companyId: apiProject.company_id,
    companyLogoUrl: apiProject.company.logo_url,
    companyVerificationStatus: apiProject.company.verification_status === 'verified'
      ? 'verified'
      : apiProject.company.verification_status === 'identity_verified'
        ? 'identity_verified'
        : apiProject.company.verification_status === 'rejected' ? 'rejected' : 'pending',
    verifiedReview: apiProject.verified_review ?? null,
  };
}

export type CompanyQuote = {
  created_at?: string;
  total_iqd: number;
  panel_iqd: number;
  inverter_iqd: number;
  battery_iqd: number;
  installation_iqd: number;
  capacity_kwp: number;
  panel_brand: string;
  inverter_brand: string;
  battery_brand: string;
  warranty: string;
  install_days: number;
  financing: boolean;
  down_payment_iqd?: number | null;
  installment_months?: number | null;
  monthly_installment_iqd?: number | null;
  green_initiative_supported?: boolean;
  valid_days: number;
  notes: string;
};

export type CompanyRegistrationBody = {
  name: string;
  email: string;
  password: string;
  founded_year?: number;
  phone?: string;
  support_phone?: string;
  address?: string;
  business_license_number?: string;
  tax_registration_number?: string;
  projects_count?: number;
};

export type CompanyVerificationUpdate = Omit<CompanyRegistrationBody, 'name' | 'founded_year' | 'phone' | 'email' | 'password' | 'address'>;

export type CompanySupportPhoneUpdate = {
  support_phone: string | null;
};

export type CompanyProfileContactUpdate = {
  phone: string | null;
  support_phone: string | null;
};

export type CompanyVerificationReview = {
  decision: 'identity_verified' | 'verified' | 'rejected';
  identity_document_checked?: boolean;
  business_document_checked?: boolean;
  project_evidence_checked?: boolean;
  license_checked: boolean;
  tax_record_checked: boolean;
  projects_checked: boolean;
};

export type CompanyQuoteBody = CompanyQuote;

export type CompanyLoginResult = {
  access_token: string;
  token_type: 'bearer';
  company: ApiCompany;
};

export type AuthRole = 'client' | 'company' | 'admin';

export type AuthUser = {
  id: number;
  email: string;
  phone: string | null;
  full_name: string;
  role: AuthRole;
  is_active: boolean;
  is_verified: boolean;
  company_id: number | null;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: 'bearer';
  user: AuthUser;
};

export type CompanyPortalRequest = QuoteRequestGroup;

export type ChatMessage = {
  id: number;
  sender_role: 'client' | 'company';
  sender_name: string;
  content: string;
  violation_type: string | null;
  created_at: string;
};

/**
 * The backend stores one string per field, the UI needs an English and an
 * Arabic one. Until the API carries both, the same text is shown in either
 * language — visibly imperfect, but never an empty card.
 */
const both = <T,>(value: T): Localized<T> => ({ en: value, ar: value });

const currentYear = new Date().getFullYear();

/** Map an API company onto the shape the cards already render. */
export function toCompany(api: ApiCompany): Company {
  const years = Math.max(currentYear - api.founded_year, 0);
  const hasFoundedYear = api.founded_year > 0;

  return {
    id: String(api.id),
    logoUrl: api.logo_url || undefined,
    status: api.verification_status === 'verified'
      ? 'verified'
      : api.verification_status === 'identity_verified'
        ? 'identity_verified'
        : api.verification_status === 'rejected' ? 'rejected' : 'pending',
    rating: api.rating,
    reviews: api.reviews_count,
    name: both(api.name),
    location: { en: api.address || 'Address not provided', ar: api.address || 'العنوان غير متوفر' },
    projects: {
      en: `${api.projects_count} projects`,
      ar: `${api.projects_count} مشروع`,
    },
    experience: {
      en: hasFoundedYear ? `${years} years` : 'Not provided',
      ar: hasFoundedYear ? `${years} سنوات` : 'غير محددة',
    },
    // The API has no services list yet, so nothing is claimed here.
    services: { en: [], ar: [] },
    supportPhone: api.support_phone?.trim()
      || api.phone?.trim()
      || api.contact_phone?.trim()
      || api.phone_number?.trim()
      || undefined,
  };
}

export const api = {
  authLogin: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  authRegisterClient: (body: { email: string; phone?: string; password: string; full_name: string }) =>
    request<AuthResponse>('/api/auth/register/client', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  authRegisterCompany: (body: CompanyRegistrationBody) =>
    request<AuthResponse>('/api/auth/register/company', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  authMe: (token: string) =>
    request<AuthUser>('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),

  featuredReviews: (limit = 6) =>
    request<ApiReview[]>(`/api/reviews/featured?limit=${limit}`),

  publicReviews: () =>
    request<ApiReview[]>('/api/reviews'),

  companyReviews: (companyId: number) =>
    request<ApiReview[]>(`/api/companies/${companyId}/reviews`),

  createReview: (body: ReviewCreateBody, token?: string) =>
    request<ApiReview>('/api/reviews', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify(body),
    }),

  myProjectReview: (projectId: number, token: string) =>
    request<ApiReview | null>(`/api/reviews/projects/${projectId}/mine`, {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateReview: (body: Omit<ReviewCreateBody, 'access_token'>, token: string) =>
    request<ApiReview>(`/api/reviews/${body.project_id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),

  completeCompanyInstallation: (token: string, groupId: string, body: CompletedInstallationBody) =>
    request<ApiProject>(`/api/quote-requests/${encodeURIComponent(groupId)}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),

  listProjects: (filters: { status?: ProjectStatus; featured?: boolean; companyId?: number } = {}) => {
    const query = new URLSearchParams();
    if (filters.status) query.set('status', filters.status);
    if (filters.featured !== undefined) query.set('featured', String(filters.featured));
    if (filters.companyId !== undefined) query.set('company_id', String(filters.companyId));
    const suffix = query.size ? `?${query.toString()}` : '';
    return request<ApiProject[]>(`/api/projects${suffix}`);
  },

  createProject: (token: string, body: ProjectCreateBody) =>
    request<ApiProject>('/api/projects', {
      method: 'POST',
      headers: { 'X-Admin-Token': token },
      body: JSON.stringify(body),
    }),

  updateProjectStatus: (projectId: number, status: ProjectStatus, legacyAdminToken?: string) =>
    request<ApiProject>(`/api/projects/${projectId}/status`, {
      method: 'PATCH',
      headers: legacyAdminToken ? { 'X-Admin-Token': legacyAdminToken } : undefined,
      body: JSON.stringify({ status }),
    }),

  listCompanies: () => request<ApiCompany[]>('/api/companies'),

  getCompany: (companyId: number) => request<ApiCompany>(`/api/companies/${companyId}`),

  listCompanyProjects: (companyId: number) =>
    request<CompanyProject[]>(`/api/companies/${companyId}/projects`),

  createQuoteRequest: (body: QuoteRequestBody) =>
    request<QuoteRequestGroup>('/api/quote-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listQuoteRequests: (accessToken: string) =>
    request<QuoteRequestGroup[]>(
      `/api/quote-requests?access_token=${encodeURIComponent(accessToken)}`,
    ),

  confirmDepositPayment: (
    groupId: string,
    companyId: number,
    paymentMethod: DepositPayment['payment_method'],
    phoneNumber: string,
    accessToken?: string,
  ) =>
    request<QuoteRequestGroup>(
      `/api/quote-requests/${encodeURIComponent(groupId)}/choose/${companyId}/deposit${accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : ''}`,
      {
        method: 'POST',
        body: JSON.stringify({ payment_method: paymentMethod, phone_number: phoneNumber }),
      },
    ),

  refundDepositPayment: (assignmentId: number) =>
    request<DepositPayment>(`/api/companies/admin/revenue/${assignmentId}/refund`, {
      method: 'POST',
    }),

  myQuoteRequests: (isGreenInitiative?: boolean) =>
    request<QuoteRequestGroup[]>(
      `/api/quote-requests/mine${isGreenInitiative === undefined ? '' : `?is_green_initiative=${isGreenInitiative}`}`,
    ),

  chatMessages: (
    groupId: string,
    companyId: number,
    accessToken?: string,
    companyToken?: string,
  ) => request<ChatMessage[]>(
    `/api/quote-requests/${encodeURIComponent(groupId)}/companies/${companyId}/messages${accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : ''}`,
    { headers: companyToken ? { Authorization: 'Bearer '.concat(companyToken) } : undefined },
  ),

  sendChatMessage: (
    groupId: string,
    companyId: number,
    content: string,
    accessToken?: string,
    companyToken?: string,
  ) => request<ChatMessage>(
    `/api/quote-requests/${encodeURIComponent(groupId)}/companies/${companyId}/messages${accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : ''}`,
    {
      method: 'POST',
      headers: companyToken ? { Authorization: 'Bearer '.concat(companyToken) } : undefined,
      body: JSON.stringify({ content }),
    },
  ),

  greenInitiativeVerification: (verificationId: string) =>
    request<GreenInitiativeVerification>(
      `/api/quote-requests/verify/${encodeURIComponent(verificationId)}`,
    ),

  updateQuoteRequest: (groupId: string, body: QuoteRequestUpdateBody, accessToken?: string) =>
    request<QuoteRequestGroup>(
      `/api/quote-requests/${encodeURIComponent(groupId)}${accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : ''}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      },
    ),

  claimGuestQuoteRequests: (accessTokens: string[]) =>
    request<{ claimed: number }>('/api/quote-requests/claim-guest', {
      method: 'POST',
      body: JSON.stringify({ access_tokens: accessTokens }),
    }),

  chooseCompanyQuote: (groupId: string, companyId: number, accessToken?: string) =>
    request<QuoteRequestGroup>(
      `/api/quote-requests/${encodeURIComponent(groupId)}/choose/${companyId}${accessToken ? `?access_token=${encodeURIComponent(accessToken)}` : ''}`,
      { method: 'POST' },
    ),

  registerCompany: (body: CompanyRegistrationBody) =>
    request<{ id: number; name: string; verification_status: string }>('/api/companies/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  loginCompany: (email: string, password: string) =>
    request<CompanyLoginResult>('/api/companies/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  requestCompanyPasswordReset: (email: string) =>
    request<{ message: string }>('/api/companies/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  confirmCompanyPasswordReset: (token: string, newPassword: string) =>
    request<{ message: string }>('/api/companies/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    }),

  logoutCompany: (token: string) =>
    request<{ detail: string }>('/api/companies/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  companyProfile: (token: string) =>
    request<ApiCompany>('/api/company/profile', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateCompanySupportPhone: (token: string, body: CompanySupportPhoneUpdate) =>
    request<{ support_phone: string | null }>('/api/company/profile/support-phone', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),

  updateCompanyProfileContacts: (token: string, body: CompanyProfileContactUpdate) =>
    request<{ phone: string | null; support_phone: string | null }>('/api/company/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),

  updateCompanyVerification: (token: string, body: CompanyVerificationUpdate) =>
    request<{ verification_status: string }>('/api/company/verification-application', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),

  companyInbox: (token: string, isGreenInitiative?: boolean) =>
    request<CompanyPortalRequest[]>(
      `/api/company/requests${isGreenInitiative === undefined ? '' : `?is_green_initiative=${isGreenInitiative}`}`,
      {
      headers: { Authorization: `Bearer ${token}` },
      },
    ),

  submitCompanyQuote: (token: string, groupId: string, companyId: number, body: CompanyQuoteBody) =>
    request<CompanyQuote>(`/api/quote-requests/${encodeURIComponent(groupId)}/quotes/${companyId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),

  adminPendingCompanies: (legacyAdminToken?: string) =>
    request<ApiCompany[]>('/api/companies/admin/pending', {
      headers: legacyAdminToken ? { 'X-Admin-Token': legacyAdminToken } : undefined,
    }),

  adminRevenue: () =>
    request<AdminRevenueEntry[]>('/api/companies/admin/revenue'),

  adminPolicyReports: () =>
    request<PolicyReport[]>('/api/companies/admin/reports'),

  updatePolicyReportStatus: (reportId: number, status: Exclude<PolicyReportStatus, 'pending'>) =>
    request<PolicyReport>(`/api/companies/admin/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  adminVerificationDocument: (companyId: number, documentType: VerificationDocumentType) =>
    request<VerificationDocument>(
      `/api/companies/admin/${companyId}/verification-documents/${documentType}`,
    ),

  uploadVerificationDocument: async (
    token: string,
    documentType: VerificationDocumentType,
    file: File,
  ) => {
    if (file.size > 3 * 1024 * 1024) {
      throw new ApiError('Verification documents must be no larger than 3 MB', 413);
    }
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      throw new ApiError('Use a PDF, JPEG, PNG, or WebP document', 415);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return request<VerificationDocument>('/api/companies/verification-documents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        document_type: documentType,
        file_name: file.name,
        content_type: file.type,
        data_base64: btoa(binary),
      }),
    });
  },

  reviewCompany: (companyId: number, body: CompanyVerificationReview, legacyAdminToken?: string) =>
    request<ApiCompany>(`/api/companies/${companyId}/verification`, {
      method: 'POST',
      headers: legacyAdminToken ? { 'X-Admin-Token': legacyAdminToken } : undefined,
      body: JSON.stringify(body),
    }),

};

/* ------------------------------------------------------------------ */
/* Quote requests                                                      */

export type QuoteRequestBody = {
  company_ids: number[];
  customer_name: string;
  customer_phone: string;
  system_kwp: number;
  battery_kwh: number;
  panel_count: number;
  is_green_initiative?: boolean;
  green_initiative_budget_iqd?: number;
  assessment_id?: number | null;
  /** Everything else the form collected, stored as JSON server-side. */
  details: Record<string, unknown>;
};

export type QuoteRequestUpdateBody = Partial<
  Pick<QuoteRequestBody, 'customer_name' | 'customer_phone' | 'system_kwp' | 'battery_kwh' | 'panel_count'>
> & {
  details?: {
    governorate?: string;
    district?: string;
    notes?: string;
  };
};

export type CompletedProject = {
  id: number;
  title: string;
  company_id: number;
  company_name: string;
  system_kwp: number;
  battery_kwh: number | null;
  location_governorate: string;
  location_district: string;
  completed_at: string | null;
  reviewed: boolean;
  status?: ProjectStatus;
  company_verification_status?: string | null;
  review_eligible?: boolean;
  review?: VerifiedProjectReview | null;
};

export type QuoteRequestGroup = {
  group_id: string;
  status: 'pending' | 'quotes_received' | 'accepted' | 'in_progress' | 'completed';
  created_at: string;
  customer_name: string;
  customer_phone: string;
  system_kwp: number;
  battery_kwh: number;
  panel_count: number;
  is_green_initiative?: boolean;
  green_initiative_budget_iqd?: number | null;
  details: {
    fromCalculator?: boolean;
    systemType?: string;
    governorate?: string;
    district?: string;
    propertyType?: string;
    roofType?: string;
    roofArea?: string;
    gridStatus?: string;
    budget?: string;
    timeline?: string;
    financing?: boolean;
    down_payment_iqd?: number;
    installment_months?: number;
    monthly_installment_iqd?: number;
    greenInitiativeRate?: number;
    notes?: string;
    whatsapp?: boolean;
  };
  access_token?: string;
  companies: {
    id: number;
    company_id: number;
    company_name: string | null;
    company_verification_status?: string | null;
    status: string;
    green_verification_id?: string | null;
    quote: CompanyQuote | null;
    completed_projects?: CompletedProject[];
    payment?: DepositPayment | null;
  }[];
};

export type GreenInitiativeVerification = {
  reference: string;
  system_kwp: number;
  battery_kwh: number;
  panel_count: number;
  governorate: string;
  district: string;
  company_name: string;
  company_verification_status: string;
  business_license_number: string | null;
  tax_registration_number: string | null;
  license_checked: boolean;
  tax_record_checked: boolean;
  projects_checked: boolean;
  reviewed_at: string | null;
};
