import type { Company } from '../data/content';
import type { Localized } from '../i18n/LanguageProvider';

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
const TIMEOUT_MS = 6000;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });

    if (!res.ok) {
      // FastAPI puts the reason in `detail`; surface it so a failed submit can
      // say what was wrong instead of "something went wrong".
      let detail = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === 'string') detail = body.detail;
      } catch {
        /* a non-JSON error body is not worth a second failure */
      }
      throw new Error(detail);
    }

    return (await res.json()) as T;
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
  phone: string;
  email: string | null;
  address: string | null;
  verification_status: string;
  rating: number;
  reviews_count: number;
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

  return {
    id: String(api.id),
    status: api.verification_status === 'verified' ? 'verified' : 'pending',
    rating: api.rating,
    reviews: api.reviews_count,
    name: both(api.name),
    location: both(api.address ?? ''),
    projects: {
      en: `${api.projects_count} projects`,
      ar: `${api.projects_count} مشروع`,
    },
    experience: {
      en: `${years} years`,
      ar: `${years} سنوات`,
    },
    // The API has no services list yet, so nothing is claimed here.
    services: { en: [], ar: [] },
  };
}

export const api = {
  listCompanies: () => request<ApiCompany[]>('/api/companies'),

  createQuoteRequest: (body: QuoteRequestBody) =>
    request<QuoteRequestGroup>('/api/quote-requests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listQuoteRequests: (phone: string) =>
    request<QuoteRequestGroup[]>(
      `/api/quote-requests?phone=${encodeURIComponent(phone)}`,
    ),
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
  assessment_id?: number | null;
  /** Everything else the form collected, stored as JSON server-side. */
  details: Record<string, unknown>;
};

export type QuoteRequestGroup = {
  group_id: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  system_kwp: number;
  battery_kwh: number;
  panel_count: number;
  details: Record<string, unknown>;
  companies: {
    id: number;
    company_id: number;
    company_name: string | null;
    status: string;
  }[];
};
